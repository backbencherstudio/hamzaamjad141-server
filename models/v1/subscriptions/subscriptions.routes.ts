import express from "express";
import bodyParser from "body-parser";
import { subscribe, handleWebhook, CreatePromoCode, getPromocode, deletePromoCode, subscribeWithPromoCode, cancelSubscription } from "./subscriptions.controllers";
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post("/pay", verifyUser("ANY"), subscribe);

// Webhook endpoint
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
);

router.post("/create-promocode",verifyUser('ADMIN'), CreatePromoCode);
router.get("/get-all-promocode",   getPromocode);
router.delete("/delete-promocode/:id", verifyUser('ADMIN'), deletePromoCode);

router.post("/subscribe-with-promo", verifyUser("ANY"), subscribeWithPromoCode);

// New endpoint for canceling subscriptions
router.post("/cancel", verifyUser("ANY"), cancelSubscription);

export default router;