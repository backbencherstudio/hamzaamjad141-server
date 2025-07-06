import express from "express";
import bodyParser from "body-parser";
import { subscribe, handleWebhook  } from "./subscriptions.controllers";
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.raw({ type: "application/json" }));

// Monthly subscription endpoint
router.post(
  "/pay",
  verifyUser('ANY'),
   subscribe
);

// Webhook endpoint
router.post(
  '/webhook',
   handleWebhook
);

export default router;