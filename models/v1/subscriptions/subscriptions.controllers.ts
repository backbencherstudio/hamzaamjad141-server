import type { Request, Response } from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

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

    // Check for existing active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (existingSubscription) {
      res.status(400).json({
        success: false,
        message: "User already has an active subscription",
      });
      return;
    }

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
            startDate: new Date(
              (stripeSubscription as any).current_period_start * 1000
            ),
            endDate: new Date(
              (stripeSubscription as any).current_period_end * 1000
            ),
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
            endDate: new Date(
              (stripeSubscription as any).current_period_end * 1000
            ),
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
  console.log(req.body);
  try {
    const { paymentMethodId } = req.body;
    const { userId } = req.user;

    const user = await prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
      res.status(400).json({ success: false, message: "User not found" });
      return;
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (existingSubscription) {
      res
        .status(400)
        .json({ error: "User already has an active subscription" });
      return;
    }

    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID }],
      expand: ["latest_invoice.payment_intent"],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: {
        userId: userId,
      },
    });

    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        price: 22,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
        stripeSubscriptionId: subscription.id,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { currentSubscriptionId: dbSubscription.id, premium: true },
    });

    res.json({
      success: true,
      message: "Subscription created successfully!",
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      type: error.type,
    });
  }
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
          startDate: new Date(
            (stripeSubscription as any).current_period_start * 1000
          ),
          endDate: new Date(
            (stripeSubscription as any).current_period_end * 1000
          ),
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
          endDate: new Date(
            (stripeSubscription as any).current_period_end * 1000
          ),
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
    const endDate = new Date((subscription as any).current_period_end * 1000);

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
  }
};

const handleSubscriptionCancelled = async (
  subscription: Stripe.Subscription
) => {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!dbSubscription) return;

  const endDate = new Date((subscription as any).current_period_end * 1000);
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
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!dbSubscription) return;

  const endDate = new Date((subscription as any).current_period_end * 1000);

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

  const endDate = new Date((subscription as any).current_period_end * 1000);

  const dbSubscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      price: (subscription.items.data[0].price.unit_amount || 0) / 100,
      startDate: new Date(subscription.start_date * 1000),
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

    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (existingSubscription) {
      res.status(400).json({
        success: false,
        message: "User already has an active subscription",
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
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "DEACTIVE",
      },
    });

    await prisma.user.update({
      where: { id: subscription.userId },
      data: { premium: false },
    });

    return res.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
