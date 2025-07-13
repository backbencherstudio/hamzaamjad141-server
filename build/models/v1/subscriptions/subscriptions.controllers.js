"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeWithPromoCode = exports.deletePromoCode = exports.getPromocode = exports.CreatePromoCode = exports.generateOTP = exports.handleWebhook = exports.subscribe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
const subscribe = async (req, res) => {
    console.log(req.body);
    try {
        const { paymentMethodId } = req.body;
        const { userId } = req.user;
        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user) {
            res.status(400).json({ success: false, message: "User not found" });
            return;
        }
        const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, status: "ACTIVE" },
        });
        if (existingSubscription) {
            res
                .status(400)
                .json({ error: "User already has an active subscription" });
            return;
        }
        let customer;
        if (user.stripeCustomerId) {
            customer = await stripe.customers.retrieve(user.stripeCustomerId);
        }
        else {
            customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId },
            });
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id },
            });
            return;
        }
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id,
        });
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID }],
            expand: ["latest_invoice.payment_intent"],
        });
        const dbSubscription = await prisma.subscription.create({
            data: {
                userId,
                price: 22,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                status: "ACTIVE",
                stripeSubscriptionId: subscription.id,
            },
        });
        await prisma.user.update({
            where: { id: userId },
            data: { currentSubscriptionId: dbSubscription.id, premium: true },
        });
        res.json({
            success: true,
            message: "Subscription created successfully!",
            subscriptionId: subscription.id,
        });
    }
    catch (error) {
        console.error("Subscription error:", error);
        res.status(400).json({
            success: false,
            error: error.message,
            type: error.type,
        });
    }
};
exports.subscribe = subscribe;
const handleWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        switch (event.type) {
            case "invoice.paid":
                await handleSuccessfulPayment(event.data.object);
                break;
            case "invoice.payment_failed":
                await handleFailedPayment(event.data.object);
                break;
            case "customer.subscription.deleted":
                await handleSubscriptionCancelled(event.data.object);
                break;
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error("Webhook error:", err);
        res.status(400).json({ error: err.message });
    }
};
exports.handleWebhook = handleWebhook;
const handleSuccessfulPayment = async (invoice) => {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
            status: "ACTIVE",
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });
};
const handleFailedPayment = async (invoice) => {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: "DEACTIVE" },
    });
};
const handleSubscriptionCancelled = async (subscription) => {
    const dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    });
    if (!dbSubscription)
        return;
    await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
            status: "DEACTIVE",
            endDate: new Date(subscription.current_period_end * 1000),
        },
    });
};
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const CreatePromoCode = async (req, res) => {
    try {
        const code = (0, exports.generateOTP)();
        console.log(code);
        const newPromoCode = await prisma.promoCode.create({
            data: {
                code,
                status: "ACTIVE",
            },
        });
        res.status(201).json({
            success: true,
            message: "Promo code created successfully",
            promoCode: newPromoCode,
        });
    }
    catch (err) {
        console.error("Error creating promo code:", err);
        res.status(500).json({
            success: false,
            message: "Failed to create promo code",
            error: err.message,
        });
    }
};
exports.CreatePromoCode = CreatePromoCode;
const getPromocode = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const status = req.query.status;
        const skip = (page - 1) * limit;
        const whereClause = {
            code: {
                contains: search,
                mode: "insensitive",
            },
        };
        if (status) {
            whereClause.status = status;
        }
        const promoCodes = await prisma.promoCode.findMany({
            skip: skip,
            take: limit,
            where: whereClause,
            include: {
                user: true,
            },
        });
        const totalPromoCodes = await prisma.promoCode.count({
            where: whereClause,
        });
        res.status(200).json({
            success: true,
            promoCodes: promoCodes,
            pagination: {
                total: totalPromoCodes,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalPromoCodes / limit),
            },
        });
    }
    catch (err) {
        console.error("Error fetching promo codes:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch promo codes",
            error: err.message,
        });
    }
};
exports.getPromocode = getPromocode;
const deletePromoCode = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCode = await prisma.promoCode.findUnique({
            where: { id },
        });
        if (!existingCode) {
            res.status(404).json({
                success: false,
                message: "Promo code not found",
            });
            return;
        }
        await prisma.promoCode.delete({
            where: { id },
        });
        res.status(200).json({
            success: true,
            message: "Promo code deleted successfully",
        });
    }
    catch (err) {
        console.error("Error deleting promo code:", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete promo code",
            error: err.message,
        });
    }
};
exports.deletePromoCode = deletePromoCode;
const subscribeWithPromoCode = async (req, res) => {
    try {
        const { promoCode } = req.body;
        const { userId } = req.user;
        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user) {
            res.status(400).json({ success: false, message: "User not found" });
            return;
        }
        const existingSubscription = await prisma.subscription.findFirst({
            where: { userId, status: "ACTIVE" },
        });
        if (existingSubscription) {
            res.status(400).json({
                success: false,
                message: "User already has an active subscription",
            });
            return;
        }
        const promo = await prisma.promoCode.findUnique({
            where: { code: promoCode },
        });
        if (!promo || promo.status !== "ACTIVE") {
            res
                .status(400)
                .json({ success: false, message: "Invalid or expired promo code" });
            return;
        }
        await prisma.promoCode.update({
            where: { code: promoCode },
            data: { status: "USED" },
        });
        const dbSubscription = await prisma.subscription.create({
            data: {
                userId,
                price: 0,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: "ACTIVE",
            },
        });
        await prisma.user.update({
            where: { id: userId },
            data: { currentSubscriptionId: dbSubscription.id, premium: true },
        });
        res.json({
            success: true,
            message: "Subscription created successfully using promo code!",
            subscriptionId: dbSubscription.id,
        });
    }
    catch (error) {
        console.error("Subscription error:", error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};
exports.subscribeWithPromoCode = subscribeWithPromoCode;
//# sourceMappingURL=subscriptions.controllers.js.map