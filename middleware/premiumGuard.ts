import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "./verifyUsers";
import { calculateTrialEndDate } from "../utils/subscription.utils";

const prisma = new PrismaClient();

export const premiumGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const userId = req.user.userId;
    const userCreationDate = new Date(req.user.createdAt);
    const trialEndDate = calculateTrialEndDate(userCreationDate);
    const now = new Date();

    if (req.user.role === "ADMIN") {
      return next();
    }

    // Check if user is still in trial period
    if (now < trialEndDate) {
      // Ensure user has premium access during trial
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premium: true },
      });

      if (!user?.premium) {
        await prisma.user.update({
          where: { id: userId },
          data: { premium: true },
        });
      }
      return next();
    }

    // Trial has ended, check for valid subscriptions (both Stripe and promo code subscriptions)
    const validSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: now },
      },
      orderBy: { endDate: "desc" },
    });

    if (validSubscription) {
      // User has valid subscription, ensure premium status is true
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premium: true },
      });

      if (!user?.premium) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            premium: true,
            currentSubscriptionId: validSubscription.id,
          },
        });
      }
      return next();
    }

    // No valid subscription found and trial has ended
    // User has NO real subscription (Stripe) AND NO promo code subscription
    // First, update any expired subscriptions to DEACTIVE
    const expiredSubscriptions = await prisma.subscription.updateMany({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { lte: now },
      },
      data: { status: "DEACTIVE" },
    });

    // IMPORTANT: Set premium to FALSE since user has no valid subscription after trial expires
    await prisma.user.update({
      where: { id: userId },
      data: {
        premium: false,
        currentSubscriptionId: null,
      },
    });

    console.log(
      `User ${userId}: Trial expired, no valid subscription found. Premium set to false.`
    );

    // Return premium required response
    res.status(403).json({
      message: "Premium subscription required. Your free trial has ended.",
      trialEnded: true,
      trialEndDate: trialEndDate.toISOString(),
      upgradeUrl: "/subscribe",
      hasExpiredSubscriptions: expiredSubscriptions.count > 0,
      requiresSubscription: true,
    });
  } catch (error) {
    console.error("Premium guard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
