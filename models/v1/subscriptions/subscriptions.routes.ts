import express from "express";
import bodyParser from "body-parser";
import { subscribe, handleWebhook } from "./subscriptions.controllers";
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post("/pay", verifyUser("ANY"), subscribe);

// Webhook endpoint
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
);

export default router;
