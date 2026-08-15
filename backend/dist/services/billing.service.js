"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
exports.getOrCreateSubscription = getOrCreateSubscription;
exports.getBillingSummary = getBillingSummary;
exports.checkAndConsumeUsage = checkAndConsumeUsage;
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
exports.handleWebhookEvent = handleWebhookEvent;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const plan_1 = require("../config/plan");
const notification_service_1 = require("./notification.service");
const email_service_1 = require("./email.service");
exports.stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY);
async function getOrCreateSubscription(userId) {
    let sub = await prisma_1.prisma.subscription.findUnique({ where: { userId } });
    if (!sub)
        sub = await prisma_1.prisma.subscription.create({ data: { userId } });
    return sub;
}
async function getBillingSummary(userId) {
    const sub = await getOrCreateSubscription(userId);
    const usage = await prisma_1.prisma.toolUsage.findMany({ where: { userId } });
    const usageMap = {};
    for (const u of usage)
        usageMap[u.tool] = u.count;
    return {
        tier: sub.tier,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        isPaid: sub.tier !== "FREE" && sub.status === "ACTIVE",
        freeUsesPerTool: plan_1.FREE_USES_PER_TOOL,
        usage: {
            AI_WRITING: usageMap.AI_WRITING ?? 0,
            AI_IMAGE: usageMap.AI_IMAGE ?? 0,
            FILE_CONVERTER: usageMap.FILE_CONVERTER ?? 0,
        },
        plans: plan_1.PLANS,
    };
}
async function checkAndConsumeUsage(userId, tool) {
    const sub = await getOrCreateSubscription(userId);
    if (sub.tier !== "FREE" && sub.status === "ACTIVE")
        return;
    const usage = await prisma_1.prisma.toolUsage.upsert({
        where: { userId_tool: { userId, tool } },
        update: {},
        create: { userId, tool, count: 0 },
    });
    if (usage.count >= plan_1.FREE_USES_PER_TOOL) {
        throw new errors_1.AppError(`You've used your ${plan_1.FREE_USES_PER_TOOL} free uses for this tool. Subscribe to keep using it.`, 402);
    }
    await prisma_1.prisma.toolUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });
}
async function createCheckoutSession(userId, email, planKey, interval = "month") {
    const plan = plan_1.PLANS[planKey];
    if (!plan)
        throw new errors_1.AppError("Invalid plan", 400);
    const priceId = interval === "year" ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId)
        throw new errors_1.AppError("This plan isn't available for that billing interval", 400);
    const sub = await getOrCreateSubscription(userId);
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
        const customer = await exports.stripe.customers.create({ email, metadata: { userId } });
        customerId = customer.id;
        await prisma_1.prisma.subscription.update({ where: { userId }, data: { stripeCustomerId: customerId } });
    }
    const session = await exports.stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env_1.env.FRONTEND_URL}/app/billing?success=true`,
        cancel_url: `${env_1.env.FRONTEND_URL}/app/billing?canceled=true`,
        metadata: { userId },
    });
    return session.url;
}
async function createPortalSession(userId) {
    const sub = await getOrCreateSubscription(userId);
    if (!sub.stripeCustomerId)
        throw new errors_1.AppError("No billing account found", 400);
    const session = await exports.stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${env_1.env.FRONTEND_URL}/app/billing`,
    });
    return session.url;
}
async function handleWebhookEvent(event) {
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            const type = session.metadata?.type;
            if (!userId || !session.subscription)
                break;
            const stripeSub = await exports.stripe.subscriptions.retrieve(session.subscription);
            const priceId = stripeSub.items.data[0]?.price.id;
            const periodEnd = new Date(stripeSub.items.data[0].current_period_end * 1000);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
            if (type === "merchant") {
                const resolved = priceId ? (0, plan_1.merchantPriceIdToTier)(priceId) : null;
                const updated = await prisma_1.prisma.bizProfile.update({
                    where: { userId },
                    data: {
                        planTier: resolved?.tier ?? "NONE",
                        planStatus: "ACTIVE",
                        stripeSubscriptionId: stripeSub.id,
                        currentPeriodEnd: periodEnd,
                    },
                });
                await (0, notification_service_1.createNotification)(userId, {
                    type: "BILLING",
                    title: "Merchant plan active",
                    message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active — your dashboard is unlocked.`,
                    actionUrl: "/merchant/dashboard",
                });
                if (user?.email) {
                    await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, {
                        planName: `Merchant ${resolved?.tier ?? "plan"}`,
                        interval: resolved?.interval === "year" ? "year" : "month",
                        periodEnd,
                    });
                }
            }
            else {
                const resolved = priceId ? (0, plan_1.priceIdToTier)(priceId) : null;
                await prisma_1.prisma.subscription.update({
                    where: { userId },
                    data: {
                        tier: resolved?.tier ?? "FREE",
                        status: "ACTIVE",
                        stripeSubscriptionId: stripeSub.id,
                        currentPeriodEnd: periodEnd,
                    },
                });
                await (0, notification_service_1.createNotification)(userId, {
                    type: "BILLING",
                    title: "Subscription active",
                    message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
                    actionUrl: "/app/billing",
                });
                if (user?.email) {
                    await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, {
                        planName: resolved?.tier ?? "plan",
                        interval: resolved?.interval === "year" ? "year" : "month",
                        periodEnd,
                    });
                }
            }
            break;
        }
        case "customer.subscription.updated": {
            const stripeSub = event.data.object;
            const priceId = stripeSub.items.data[0]?.price.id;
            const periodEnd = new Date(stripeSub.items.data[0].current_period_end * 1000);
            const status = stripeSub.status === "active" ? "ACTIVE" : stripeSub.status === "past_due" ? "PAST_DUE" : "CANCELED";
            const toolSub = await prisma_1.prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
            if (toolSub) {
                const resolved = priceId ? (0, plan_1.priceIdToTier)(priceId) : null;
                await prisma_1.prisma.subscription.update({
                    where: { id: toolSub.id },
                    data: {
                        tier: resolved?.tier ?? toolSub.tier,
                        status,
                        currentPeriodEnd: periodEnd,
                        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                    },
                });
                break;
            }
            const bizProfile = await prisma_1.prisma.bizProfile.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
            if (bizProfile) {
                const resolved = priceId ? (0, plan_1.merchantPriceIdToTier)(priceId) : null;
                await prisma_1.prisma.bizProfile.update({
                    where: { id: bizProfile.id },
                    data: {
                        planTier: resolved?.tier ?? bizProfile.planTier,
                        planStatus: status,
                        currentPeriodEnd: periodEnd,
                    },
                });
            }
            break;
        }
        case "customer.subscription.deleted": {
            const stripeSub = event.data.object;
            const toolSub = await prisma_1.prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
            if (toolSub) {
                await prisma_1.prisma.subscription.update({ where: { id: toolSub.id }, data: { tier: "FREE", status: "CANCELED", stripeSubscriptionId: null } });
                break;
            }
            const bizProfile = await prisma_1.prisma.bizProfile.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
            if (bizProfile) {
                await prisma_1.prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planTier: "NONE", planStatus: "INACTIVE", stripeSubscriptionId: null } });
            }
            break;
        }
    }
}
