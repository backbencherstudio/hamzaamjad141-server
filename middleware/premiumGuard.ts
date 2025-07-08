import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "./verifyUsers";

const prisma = new PrismaClient();

export const premiumGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const userCreationDate = new Date(req.user.createdAt);
    const trialEndDate = new Date(userCreationDate);
    trialEndDate.setDate(userCreationDate.getDate() + 3);

    if (new Date() < trialEndDate) {
      next();
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
      await prisma.subscription.updateMany({
        where: {
          userId: req.user.userId,
          status: "ACTIVE",
          endDate: { lte: new Date() },
        },
        data: { status: "DEACTIVE" },
      });

      res.status(403).json({
        message: "Premium subscription required",
        trialEnded: true,
        trialEndDate: trialEndDate.toISOString(),
        upgradeUrl: "/subscribe",
      });
    }

    next();
  } catch (error) {
    console.error("Premium guard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
