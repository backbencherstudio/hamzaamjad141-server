import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import cron from "node-cron";
import v1 from "./models/v1/index";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Add this function to check expired subscriptions
// async function checkExpiredSubscriptions() {
//   try {
//     console.log("Checking for expired subscriptions...");
    
//     // Find all active subscriptions that have expired
//     const expiredSubscriptions = await prisma.subscription.findMany({
//       where: {
//         status: "ACTIVE",
//         endDate: { lte: new Date() }
//       }
//     });
    
//     console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);
    
//     // Update each subscription and user
//     for (const subscription of expiredSubscriptions) {
//       await prisma.subscription.update({
//         where: { id: subscription.id },
//         data: { status: "DEACTIVE" }
//       });
      
//       await prisma.user.update({
//         where: { id: subscription.userId },
//         data: { premium: false }
//       });
      
//       console.log(`Updated subscription ${subscription.id} for user ${subscription.userId}`);
//     }
//   } catch (error) {
//     console.error("Error checking expired subscriptions:", error);
//   }
// }

// // Schedule the task to run daily at midnight
// cron.schedule("0 0 * * *", checkExpiredSubscriptions);

// // Run once at startup to handle any subscriptions that expired while the server was down
// checkExpiredSubscriptions();

const app = express();

app.use(
  cors({
    origin: [
      "http://192.168.30.102:3000",
      "http://192.168.30.102:*",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:16439/a.html",
      "http://127.0.0.1:16439",
      "http://localhost:5173",
      "https://dash.leftseatlessons.com",
      "http://dash.leftseatlessons.com",
      "https://www.dash.leftseatlessons.com",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://192.168.4.30:3001",
      "http://192.168.4.30:3002",
      "https://hamzaamjad-dashboard.vercel.app",
      "http://127.0.0.1:58456"

    ]
  })
);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

 
// app.use("/", async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Use raw SQL to drop the Weather table
//     await prisma.$executeRaw`DROP TABLE IF EXISTS "subscription" CASCADE`; // Adjust if your table name has different casing

//     console.log("Weather table deleted successfully!");
//     res.status(200).json({ message: "Weather table deleted successfully!" });
//   } catch (error) {
//     console.error("Error deleting Weather table:", error);
//     res.status(500).json({ error: "Failed to delete Weather table" });
//   } finally {
//     await prisma.$disconnect();
//   }
// });


app.use((req, res, next) => {
  if (req.originalUrl === '/subscription/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", v1)

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `404 route not found`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    message: `500 Something broken!`,
    error: err.message,
  });
});


app.use(express.static(path.join(__dirname, "public")));

export default app;


