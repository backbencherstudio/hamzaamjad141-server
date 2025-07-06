import { Request, Response } from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const subscribe = async (req: any, res: Response) => {
  try {
    const { paymentMethodId } = req.body;
    const { userId } = req.user;

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    console.log()

    if (!user) {
      res.status(400).json({
        message: "user Not found",
      });
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    if (existingSubscription) {
      res
        .status(400)
        .json({ error: "User already has an active subscription" });
      return;
    }

    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
    }

    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
    } catch (err: any) {
      if (err.code !== "resource_already_attached") {
        throw err;
      }
    }

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID! }],
      expand: ["latest_invoice"],
    });

    const dbSubscription = await prisma.subscription.create({
      data: {
        userId,
        price: 22,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
        stripeSubscriptionId: stripeSubscription.id,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { currentSubscriptionId: dbSubscription.id },
    });

    res.json({
      success: true,
      message: "Subscription created successfully!",
      customerId: customer.id,
      subscriptionId: stripeSubscription.id,
    });
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

  const handleSuccessfulPayment =  async (invoice: Stripe.Invoice) => {
    const subscriptionId = (invoice as any).subscription as string;
    const customerId = invoice.customer as string;
    
    if (!subscriptionId) return;

    // Update subscription in database
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      data: {
        status: "ACTIVE",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Renew for 30 days
      },
    });
  }



  const handleFailedPayment = async (invoice: Stripe.Invoice) => {
    const subscriptionId = (invoice as any).subscription as string;
    
    if (!subscriptionId) return;

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "DEACTIVE" },
    });
  }



  const handleSubscriptionCancelled = async (subscription: Stripe.Subscription) => {
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: {
        id: dbSubscription.id,
      },
      data: {
        status: "DEACTIVE",
        endDate: new Date((subscription as any).current_period_end * 1000),
      },
    });
  }


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
        const invoice = event.data.object as Stripe.Invoice;
        await handleSuccessfulPayment(invoice);
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handleFailedPayment(failedInvoice);
        break;

      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(400).json({ error: err.message });
  }
};

export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};
  

export const CreatePromoCode = async (req: any, res: Response) => {
  try {
    const code = generateOTP();
    console.log(code);
    const newPromoCode = await prisma.promoCode.create({
      data: {
        code,
        status: 'ACTIVE', 
      },
    });
    res.status(201).json({ 
      success: true,
      message: 'Promo code created successfully', 
      promoCode: newPromoCode 
    });
  } catch (err) {
    console.error('Error creating promo code:', err);
    res.status(500).json({ success: false, message: 'Failed to create promo code', error: err.message });
  }
};