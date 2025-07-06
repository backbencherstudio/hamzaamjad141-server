import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createSubscription = async (req: any, res: Response) => {
  const { email, amount, paymentMethodId, trialPeriod } = req.body;

  if (!email || !amount || !paymentMethodId) {
     res.status(400).json({
      success: false,
      message: "Email, amount, and payment method are required."
    });
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true }
    });

    if (!user) {
       res.status(404).json({
        success: false,
        message: "User not found."
      });
      return
    }

    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.CLIENT_URL}/subscription/success`
    });

    if (paymentIntent.status === 'succeeded') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);


      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          price: parseFloat(amount),
          endDate,
          status: 'ACTIVE',
          trialPeriod: trialPeriod || false
        }
      });

      // Update user's current subscription
      await prisma.user.update({
        where: { id: user.id },
        data: { currentSubscriptionId: subscription.id }
      });

      res.status(200).json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          endDate: subscription.endDate,
          status: subscription.status
        }
      });
    } else {
      throw new Error('Payment failed');
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription.'
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user?.currentSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: user.currentSubscriptionId },
      data: { status: 'DEACTIVE' }
    });

    // Remove current subscription from user
    await prisma.user.update({
      where: { id: userId },
      data: { currentSubscriptionId: null }
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

// Get subscription status
export const getSubscriptionStatus = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentSubscription = user.subscription[0];

    res.json({
      success: true,
      data: currentSubscription ? {
        status: currentSubscription.status,
        endDate: currentSubscription.endDate,
        price: currentSubscription.price,
        trialPeriod: currentSubscription.trialPeriod
      } : null
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

// Update subscription
export const updateSubscription = async (req: any, res: Response) => {
  const { price, endDate } = req.body;
  
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.currentSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: user.currentSubscriptionId },
      data: {
        price: price ? parseFloat(price) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      }
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};