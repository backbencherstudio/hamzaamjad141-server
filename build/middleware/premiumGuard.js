"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.premiumGuard = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const premiumGuard = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const userCreationDate = new Date(req.user.createdAt);
        const trialEndDate = new Date(userCreationDate);
        trialEndDate.setDate(userCreationDate.getDate() + 3);
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
            console.log(232423);
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
    }
    catch (error) {
        console.error("Premium guard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.premiumGuard = premiumGuard;
//# sourceMappingURL=premiumGuard.js.map