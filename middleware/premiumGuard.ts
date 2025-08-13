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

    const userCreationDate = new Date(req.user.createdAt);
    const trialEndDate = calculateTrialEndDate(userCreationDate);
    const now = new Date();

    // Check if user is still in trial period
    if (now < trialEndDate) {
      return next();
    }

    // Find active subscription that hasn't expired
    const validSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.userId,
        status: "ACTIVE",
        endDate: { gt: now },
      },
      orderBy: { endDate: "desc" },
      take: 1,
    });

    if (!validSubscription) {
      // Clean up any expired subscriptions
      const expiredSubscriptions = await prisma.subscription.updateMany({
        where: {
          userId: req.user.userId,
          status: "ACTIVE",
          endDate: { lte: now },
        },
        data: { status: "DEACTIVE" },
      });

      // Only update user premium status if we actually found expired subscriptions
      if (expiredSubscriptions.count > 0) {
        await prisma.user.update({
          where: { id: req.user.userId },
          data: { premium: false },
        });
      }

      res.status(403).json({
        message: "Premium subscription required",
        trialEnded: true,
        trialEndDate: trialEndDate.toISOString(),
        upgradeUrl: "/subscribe",
      });
      return;
    }

    // ✅ User has valid subscription - ensure premium status is correct
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { premium: true }
    });

    if (!user?.premium) {
      // Fix inconsistency - user has valid subscription but premium is false
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { premium: true },
      });
    }

    return next();
  } catch (error) {
    console.error("Premium guard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
