import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ⏰ Runs every day at 2:00 AM
cron.schedule("0 2 * * *", async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.userNewMember.updateMany({
      where: {
        status: "active",
        createdAt: { lte: threeDaysAgo },
      },
      data: {
        status: "deactive",
        subscription: "unsubscribed",
        action: "auto-deactivated",
      },
    });

    console.log(`[CRON] Deactivated ${result.count} users`);
  } catch (error) {
    console.error("[CRON] Error during user deactivation:", error);
  }
});
