import express from "express"
import bodyParser from "body-parser"
import {
  subscribe,
  handleWebhook,
  CreatePromoCode,
  getPromocode,
  deletePromoCode,
  subscribeWithPromoCode,
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  verifyCheckoutSession,
  getSubscriptionInfo,
} from "./subscriptions.controllers"
import { verifyUser } from "../../../middleware/verifyUsers"

const router = express.Router()

// New Stripe Checkout routes
router.post("/create-checkout-session", verifyUser("ANY"), createCheckoutSession)
router.post("/create-portal-session", verifyUser("ANY"), createPortalSession)
router.post("/verify-checkout-session", verifyUser("ANY"), verifyCheckoutSession)

// Legacy routes (keep for backward compatibility)
router.post("/pay", verifyUser("ANY"), subscribe)
router.post("/subscribe-with-promo", verifyUser("ANY"), subscribeWithPromoCode)
router.post("/cancel", verifyUser("ANY"), cancelSubscription)

router.get("/info", verifyUser("ANY"), getSubscriptionInfo)

// Auto-renewal reminders (for cron job)
// router.post("/send-renewal-reminders", sendAutoRenewalReminders)

// Webhook endpoint
router.post("/webhook", handleWebhook)

// Promo code routes
router.post("/create-promocode", verifyUser("ADMIN"), CreatePromoCode)
router.get("/get-all-promocode", getPromocode)
router.delete("/delete-promocode/:id", verifyUser("ADMIN"), deletePromoCode)

export default router
