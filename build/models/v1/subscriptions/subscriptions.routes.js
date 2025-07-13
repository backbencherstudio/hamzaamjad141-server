"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const subscriptions_controllers_1 = require("./subscriptions.controllers");
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const router = express_1.default.Router();
router.post("/pay", (0, verifyUsers_1.verifyUser)("ANY"), subscriptions_controllers_1.subscribe);
// Webhook endpoint
router.post("/webhook", body_parser_1.default.raw({ type: "application/json" }), subscriptions_controllers_1.handleWebhook);
router.post("/create-promocode", (0, verifyUsers_1.verifyUser)('ADMIN'), subscriptions_controllers_1.CreatePromoCode);
router.get("/get-all-promocode", subscriptions_controllers_1.getPromocode);
router.delete("/delete-promocode/:id", (0, verifyUsers_1.verifyUser)('ADMIN'), subscriptions_controllers_1.deletePromoCode);
router.post("/subscribe-with-promo", (0, verifyUsers_1.verifyUser)("ANY"), subscriptions_controllers_1.subscribeWithPromoCode);
exports.default = router;
//# sourceMappingURL=subscriptions.routes.js.map