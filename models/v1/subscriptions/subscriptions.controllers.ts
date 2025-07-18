import { Request, Response } from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      return;
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
    });

    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        price: 22,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
  const sig = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "invoice.paid":
        await handleSuccessfulPayment(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleFailedPayment(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(400).json({ error: err.message });
  }
};

const handleSuccessfulPayment = async (invoice: Stripe.Invoice) => {
  const subscriptionId = (invoice as any).subscription as string | undefined;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "ACTIVE",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
};

const handleFailedPayment = async (invoice: Stripe.Invoice) => {
  const subscriptionId = (invoice as any).subscription as string | undefined;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "DEACTIVE" },
  });
};

const handleSubscriptionCancelled = async (
  subscription: Stripe.Subscription
) => {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) return;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: "DEACTIVE",
      endDate: new Date((subscription as any).current_period_end * 1000),
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
  } catch (err) {
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
  } catch (err) {
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
  } catch (err) {
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