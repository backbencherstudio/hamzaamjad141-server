import type { Request, Response } from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { 
  sendPaymentSuccessEmail, 
  sendPaymentFailedEmail, 
  sendSubscriptionCancelledEmail 
} from "../../../utils/emailService.utils";
import { SUBSCRIPTION_DURATION_MS, calculateSubscriptionEndDate } from "../../../utils/subscription.utils";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create Stripe Checkout Session
export const createCheckoutSession = async (req: any, res: Response) => {
  try {
    const { userId } = req.user;
    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
      res.status(400).json({ success: false, message: "User not found" });
      return;
    }

    // Check for existing paid active subscription (exclude trial period)
    const existingPaidSubscription = await prisma.subscription.findFirst({
      where: { 
        userId, 
        status: "ACTIVE",
        stripeSubscriptionId: { not: null } // Only check for Stripe subscriptions (paid)
      },
    });

    if (existingPaidSubscription) {
      res.status(400).json({
        success: false,
        message: "User already has an active paid subscription",
      });
      return;
    }

    // Check if user is in trial period
    const userCreationDate = new Date(user.createdAt);
    const trialEndDate = calculateSubscriptionEndDate(userCreationDate);
    const isInTrial = new Date() < trialEndDate;

    // Create or retrieve Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        "myflutterapp://payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "myflutterapp://payment-cancel",
      metadata: {
        userId: userId,
        email: user?.email,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("Checkout session error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Create Customer Portal Session
export const createPortalSession = async (req: any, res: Response) => {
  try {
    const { userId } = req.user;
    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user || !user.stripeCustomerId) {
      res.status(400).json({
        success: false,
        message: "User not found or no Stripe customer ID",
      });
      return;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/subscription`,
    });

    res.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error: any) {
    console.error("Portal session error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify Checkout Session (client-side verification)
export const verifyCheckoutSession = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.body;
    const { userId } = req.user;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.payment_status === "paid" &&
      session.metadata?.userId === userId
    ) {
      // Explicitly assert the type to Stripe.Subscription
      const stripeSubscription = (await stripe.subscriptions.retrieve(
        session.subscription as string
      )) as Stripe.Subscription;

      // If user is upgrading from trial, deactivate any trial subscriptions
      const trialSubscriptions = await prisma.subscription.findMany({
        where: {
          userId,
          status: "ACTIVE",
          stripeSubscriptionId: null, // Trial subscriptions don't have Stripe ID
        },
      });

      if (trialSubscriptions.length > 0) {
        await prisma.subscription.updateMany({
          where: {
            userId,
            status: "ACTIVE",
            stripeSubscriptionId: null,
          },
          data: {
            status: "DEACTIVE",
            endDate: new Date(), // End trial immediately when paid subscription starts
          },
        });
      }

      // Find or create the subscription in the database
      let dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubscription.id },
      });

      if (!dbSubscription) {
        // Fallback: If webhook for customer.subscription.created didn't fire or process yet, create it here.
        console.warn(
          `Subscription ${stripeSubscription.id} not found in DB for checkout.session.completed. Creating as fallback.`
        );
        dbSubscription = await prisma.subscription.create({
          data: {
            userId,
            price:
              (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
            startDate: (stripeSubscription as any).current_period_start
              ? new Date((stripeSubscription as any).current_period_start * 1000)
              : new Date(),
            endDate: (stripeSubscription as any).current_period_end
              ? new Date((stripeSubscription as any).current_period_end * 1000)
              : calculateSubscriptionEndDate(), // 30 days fallback
            status:
              stripeSubscription.status === "active" ? "ACTIVE" : "DEACTIVE", // Use Stripe's status
            stripeSubscriptionId: stripeSubscription.id,
          },
        });
      } else {
        // If found, update its status and end date
        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status:
              stripeSubscription.status === "active" ? "ACTIVE" : "DEACTIVE",
            endDate: (stripeSubscription as any).current_period_end
              ? new Date((stripeSubscription as any).current_period_end * 1000)
              : calculateSubscriptionEndDate(), // 30 days fallback
          },
        });
      }

      // Always update user's premium status and current subscription link
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentSubscriptionId: dbSubscription.id,
          premium: stripeSubscription.status === "active", // Set premium based on Stripe's status
        },
      });

      // Send success email if subscription is active
      if (stripeSubscription.status === "active") {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user?.email) {
            await sendPaymentSuccessEmail(
              user.email,
              user.name || "Valued Customer",
              {
                price: dbSubscription.price,
                endDate: dbSubscription.endDate,
                status: "ACTIVE"
              }
            );
          }
        } catch (emailError) {
          console.error("Failed to send verification success email:", emailError);
          // Don't throw error - email failure shouldn't break the response
        }
      }

      res.json({
        success: true,
        message: "Subscription activated successfully!",
        subscription: dbSubscription,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment not completed or session invalid",
      });
    }
  } catch (error: any) {
    console.error("Verify session error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const subscribe = async (req: any, res: Response) => {
};

export const handleWebhook = async (req: Request, res: Response) => {
  console.log("Webhook received");
  console.log(284, process.env.STRIPE_WEBHOOK_SECRET);

  const sig = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`Webhook event received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "invoice.paid":
        await handleSuccessfulPayment(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleFailedPayment(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(400).json({ error: err.message });
  }
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  try {
    const userId = session.metadata?.userId;
    if (!userId || !session.subscription) return;

    // Explicitly assert the type to Stripe.Subscription
    const stripeSubscription = (await stripe.subscriptions.retrieve(
      session.subscription as string
    )) as Stripe.Subscription;

    // If user is upgrading from trial, deactivate any trial subscriptions
    const trialSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: "ACTIVE",
        stripeSubscriptionId: null, // Trial subscriptions don't have Stripe ID
      },
    });

    if (trialSubscriptions.length > 0) {
      await prisma.subscription.updateMany({
        where: {
          userId,
          status: "ACTIVE",
          stripeSubscriptionId: null,
        },
        data: {
          status: "DEACTIVE",
          endDate: new Date(), // End trial immediately when paid subscription starts
        },
      });
    }

    // Find the subscription in our database (it should have been created by customer.subscription.created webhook)
    let dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!dbSubscription) {
      // Fallback: If for some reason customer.subscription.created didn't fire or process yet, create it here.
      console.warn(
        `Subscription ${stripeSubscription.id} not found in DB for checkout.session.completed. Creating as fallback.`
      );
      dbSubscription = await prisma.subscription.create({
        data: {
          userId,
          price:
            (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
          startDate: (stripeSubscription as any).current_period_start
            ? new Date((stripeSubscription as any).current_period_start * 1000)
            : new Date(),
          endDate: (stripeSubscription as any).current_period_end
            ? new Date((stripeSubscription as any).current_period_end * 1000)
            : calculateSubscriptionEndDate(), // 30 days fallback
          status:
            stripeSubscription.status === "active" ? "ACTIVE" : "DEACTIVE", // Use Stripe's status
          stripeSubscriptionId: stripeSubscription.id,
        },
      });
    } else {
      // If it exists, ensure its status and end date are up-to-date based on checkout completion
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status:
            stripeSubscription.status === "active" ? "ACTIVE" : "DEACTIVE",
          endDate: (stripeSubscription as any).current_period_end
            ? new Date((stripeSubscription as any).current_period_end * 1000)
            : calculateSubscriptionEndDate(), // 30 days fallback
        },
      });
    }

    // Always update the user's premium status and current subscription link
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSubscriptionId: dbSubscription.id,
        premium: stripeSubscription.status === "active", // Set premium based on Stripe's status
      },
    });

    // Send success email if subscription is active
    if (stripeSubscription.status === "active") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user?.email) {
          await sendPaymentSuccessEmail(
            user.email,
            user.name || "Valued Customer",
            {
              price: dbSubscription.price,
              endDate: dbSubscription.endDate,
              status: "ACTIVE"
            }
          );
        }
      } catch (emailError) {
        console.error("Failed to send checkout success email:", emailError);
        // Don't throw error - email failure shouldn't break webhook processing
      }
    }
  } catch (error) {
    console.error("Error handling checkout completed:", error);
  }
};

const handleSuccessfulPayment = async (invoice: Stripe.Invoice) => {
  console.log("111111111111111111")
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  try {
    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription;
    const endDate = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : calculateSubscriptionEndDate(); // 30 days fallback

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "ACTIVE",
        endDate: endDate,
      },
    });

    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (dbSubscription) {
      await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { premium: true },
      });

      // Send success email to user
      try {
        const user = await prisma.user.findUnique({
          where: { id: dbSubscription.userId },
        });

        if (user?.email) {
          await sendPaymentSuccessEmail(
            user.email,
            user.name || "Valued Customer",
            {
              price: dbSubscription.price,
              endDate: dbSubscription.endDate,
              status: "ACTIVE"
            }
          );
        }
      } catch (emailError) {
        console.error("Failed to send payment success email:", emailError);
        // Don't throw error - email failure shouldn't break webhook processing
      }
    }
  } catch (error) {
    console.error("Error processing successful payment:", error);
  }
};

const handleFailedPayment = async (invoice: Stripe.Invoice) => {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "DEACTIVE" },
  });

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (dbSubscription) {
    await prisma.user.update({
      where: { id: dbSubscription.userId },
      data: { premium: false },
    });

    // Send failed payment email to user
    try {
      const user = await prisma.user.findUnique({
        where: { id: dbSubscription.userId },
      });

      if (user?.email) {
        await sendPaymentFailedEmail(
          user.email,
          user.name || "Valued Customer",
          {
            price: dbSubscription.price,
            endDate: dbSubscription.endDate,
            status: "DEACTIVE"
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send payment failed email:", emailError);
      // Don't throw error - email failure shouldn't break webhook processing
    }
  }
};

const handleSubscriptionCancelled = async (
  subscription: Stripe.Subscription
) => {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!dbSubscription) return;

  const endDate = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : calculateSubscriptionEndDate(); // 30 days fallback
  const isExpired = endDate <= new Date();

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "DEACTIVE",
      endDate: endDate,
    },
  });

  if (isExpired) {
    await prisma.user.update({
      where: { id: dbSubscription.userId },
      data: { premium: false },
    });
  }

  // Send subscription cancelled email to user
  try {
    const user = await prisma.user.findUnique({
      where: { id: dbSubscription.userId },
    });

    if (user?.email) {
      await sendSubscriptionCancelledEmail(
        user.email,
        user.name || "Valued Customer",
        {
          price: dbSubscription.price,
          endDate: dbSubscription.endDate,
          status: "DEACTIVE"
        }
      );
    }
  } catch (emailError) {
    console.error("Failed to send subscription cancelled email:", emailError);
    // Don't throw error - email failure shouldn't break webhook processing
  }
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!dbSubscription) return;

  const endDate = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : calculateSubscriptionEndDate(); // 30 days fallback

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: subscription.status === "active" ? "ACTIVE" : "DEACTIVE",
      endDate: endDate,
    },
  });

  await prisma.user.update({
    where: { id: dbSubscription.userId },
    data: { premium: subscription.status === "active" },
  });
};

const handleSubscriptionCreated = async (subscription: Stripe.Subscription) => {
  const existingSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (existingSubscription) return;

  const customerId = subscription.customer as string;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!user) return;

  // If user is upgrading from trial, deactivate any trial subscriptions
  const trialSubscriptions = await prisma.subscription.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      stripeSubscriptionId: null, // Trial subscriptions don't have Stripe ID
    },
  });

  if (trialSubscriptions.length > 0) {
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        stripeSubscriptionId: null,
      },
      data: {
        status: "DEACTIVE",
        endDate: new Date(), // End trial immediately when paid subscription starts
      },
    });
  }

  const endDate = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : calculateSubscriptionEndDate(); // 30 days fallback

  const dbSubscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      price: (subscription.items.data[0].price.unit_amount || 0) / 100,
      startDate: (subscription as any).start_date 
        ? new Date((subscription as any).start_date * 1000)
        : new Date(),
      endDate: endDate,
      status: subscription.status === "active" ? "ACTIVE" : "DEACTIVE",
      stripeSubscriptionId: subscription.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      currentSubscriptionId: dbSubscription.id,
      premium: subscription.status === "active",
    },
  });
};

// Get subscription status for a user
export const getSubscriptionStatus = async (req: any, res: Response) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        premium: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate trial info
    const userCreationDate = new Date(user.createdAt);
    const trialEndDate = calculateSubscriptionEndDate(userCreationDate);
    const isInTrial = new Date() < trialEndDate;

    // Get active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });

    // Get Stripe subscription status if exists
    let stripeStatus = null;
    if (activeSubscription?.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          activeSubscription.stripeSubscriptionId
        );
        stripeStatus = {
          status: stripeSubscription.status,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        };
      } catch (error) {
        console.error("Error fetching Stripe subscription:", error);
      }
    }

    return res.json({
      success: true,
      data: {
        premium: user.premium,
        isInTrial,
        trialEndDate: trialEndDate.toISOString(),
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          price: activeSubscription.price,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          status: activeSubscription.status,
        } : null,
        stripe: stripeStatus,
      }
    });
  } catch (error: any) {
    console.error("Get subscription status error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 900000).toString();
};

export const CreatePromoCode = async (req: any, res: Response) => {
  try {
    const code = generateOTP();
    console.log(code);
    const newPromoCode = await prisma.promoCode.create({
      data: {
        code,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      promoCode: newPromoCode,
    });
  } catch (err: any) {
    console.error("Error creating promo code:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create promo code",
      error: err.message,
    });
  }
};

export const getPromocode = async (req: any, res: Response) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      code: {
        contains: search,
        mode: "insensitive",
      },
    };

    if (status) {
      whereClause.status = status;
    }

    const promoCodes = await prisma.promoCode.findMany({
      skip: skip,
      take: limit,
      where: whereClause,
      include: {
        user: true,
      },
    });

    const totalPromoCodes = await prisma.promoCode.count({
      where: whereClause,
    });

    res.status(200).json({
      success: true,
      promoCodes: promoCodes,
      pagination: {
        total: totalPromoCodes,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalPromoCodes / limit),
      },
    });
  } catch (err: any) {
    console.error("Error fetching promo codes:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promo codes",
      error: err.message,
    });
  }
};

export const deletePromoCode = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const existingCode = await prisma.promoCode.findUnique({
      where: { id },
    });

    if (!existingCode) {
      res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
      return;
    }

    await prisma.promoCode.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Promo code deleted successfully",
    });
  } catch (err: any) {
    console.error("Error deleting promo code:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete promo code",
      error: err.message,
    });
  }
};

export const subscribeWithPromoCode = async (req: any, res: Response) => {
  try {
    const { promoCode } = req.body;
    const { userId } = req.user;

    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
      res.status(400).json({ success: false, message: "User not found" });
      return;
    }

    // Check for existing paid active subscription (exclude trial period)
    const existingPaidSubscription = await prisma.subscription.findFirst({
      where: { 
        userId, 
        status: "ACTIVE",
        stripeSubscriptionId: { not: null } // Only check for Stripe subscriptions (paid)
      },
    });

    if (existingPaidSubscription) {
      res.status(400).json({
        success: false,
        message: "User already has an active paid subscription",
      });
      return;
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (!promo || promo.status !== "ACTIVE") {
      res
        .status(400)
        .json({ success: false, message: "Invalid or expired promo code" });
      return;
    }

    await prisma.promoCode.update({
      where: { code: promoCode },
      data: { status: "USED" },
    });

    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        price: 0,
        startDate: new Date(),
        endDate: calculateSubscriptionEndDate(),
        status: "ACTIVE",
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { currentSubscriptionId: dbSubscription.id, premium: true },
    });

    res.json({
      success: true,
      message: "Subscription created successfully using promo code!",
      subscriptionId: dbSubscription.id,
    });
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const cancelSubscription = async (req: any, res: Response) => {
  try {
    const { userId } = req.user;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    // Set cancel_at_period_end to true in Stripe - user keeps access until period ends
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // ✅ DO NOT change subscription status or premium status immediately
    // The subscription remains ACTIVE until the end date
    // Stripe webhook will handle the actual deactivation when period ends

    // Get the current period end from Stripe to inform user
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const periodEndDate = new Date((stripeSubscription as any).current_period_end * 1000);

    // Send subscription cancellation scheduled email to user
    try {
      const user = await prisma.user.findUnique({
        where: { id: subscription.userId },
      });

      if (user?.email) {
        await sendSubscriptionCancelledEmail(
          user.email,
          user.name || "Valued Customer",
          {
            price: subscription.price,
            endDate: periodEndDate,
            status: "ACTIVE", // Still active until period end
            willEndOn: periodEndDate.toISOString()
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send manual cancellation email:", emailError);
      // Don't throw error - email failure shouldn't break the response
    }

    return res.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      currentPeriodEnd: periodEndDate.toISOString(),
      accessUntil: periodEndDate.toISOString()
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};