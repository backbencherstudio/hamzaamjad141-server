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

    // ADMIN users have free access to all premium features
    if (req.user.role === "ADMIN") {
      return next();
    }

    const userCreationDate = new Date(req.user.createdAt);
    const trialEndDate = calculateTrialEndDate(userCreationDate);

    if (new Date() < trialEndDate) {
      return next();
    }

    const validSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.userId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
      take: 1,
    });

    if (!validSubscription) {
      console.log(232423)
      await prisma.subscription.updateMany({
        where: {
          userId: req.user.userId,
          status: "ACTIVE",
          endDate: { lte: new Date() },
        },
        data: { status: "DEACTIVE" },
      });

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { premium: false },
      });

      res.status(403).json({
        message: "Premium subscription required",
        trialEnded: true,
        trialEndDate: trialEndDate.toISOString(),
        upgradeUrl: "/subscribe",
      });
      return;
    }

    return next();
  } catch (error) {
    console.error("Premium guard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
