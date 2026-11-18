"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateSubscription = getOrCreateSubscription;
exports.getBillingSummary = getBillingSummary;
exports.checkAndConsumeUsage = checkAndConsumeUsage;
exports.refundUsage = refundUsage;
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
exports.handleWebhookEvent = handleWebhookEvent;
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const plan_1 = require("../config/plan");
const notification_service_1 = require("./notification.service");
const email_service_1 = require("./email.service");
const paystack = __importStar(require("./paystack.service"));
async function getOrCreateSubscription(userId) {
    return prisma_1.prisma.subscription.upsert({ where: { userId }, update: {}, create: { userId } });
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
        billingInterval: sub.billingInterval ?? null,
        plans: (0, plan_1.publicPlans)(),
    };
}
async function checkAndConsumeUsage(userId, tool) {
    const sub = await getOrCreateSubscription(userId);
    if (sub.tier !== "FREE" && sub.status === "ACTIVE")
        return false;
    await prisma_1.prisma.toolUsage.createMany({ data: [{ userId, tool, count: 0 }], skipDuplicates: true });
    const updated = await prisma_1.prisma.toolUsage.updateMany({
        where: { userId, tool, count: { lt: plan_1.FREE_USES_PER_TOOL } },
        data: { count: { increment: 1 } },
    });
    if (updated.count === 0) {
        throw new errors_1.AppError(`You've used your ${plan_1.FREE_USES_PER_TOOL} free uses for this tool. Subscribe to keep using it.`, 402);
    }
    return true;
}
async function refundUsage(userId, tool) {
    await prisma_1.prisma.toolUsage.updateMany({ where: { userId, tool, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
}
async function createCheckoutSession(userId, email, planKey, interval = "month") {
    const current = await getOrCreateSubscription(userId);
    if (current.tier !== "FREE" && current.status === "ACTIVE") {
        throw new errors_1.AppError("You already have an active subscription. Use Manage subscription to change or cancel it.", 409);
    }
    const plan = plan_1.PLANS[planKey];
    if (!plan)
        throw new errors_1.AppError("Invalid plan", 400);
    const planCode = interval === "year" ? plan.planCodeYearly : plan.planCodeMonthly;
    if (!planCode)
        throw new errors_1.AppError("This plan isn't available for that billing interval", 400);
    const result = await paystack.initializeTransaction({
        email,
        plan: planCode,
        callback_url: `${env_1.env.FRONTEND_URL}/app/billing?success=true`,
        metadata: { userId },
    });
    return result.authorization_url;
}
async function createPortalSession(userId) {
    const sub = await getOrCreateSubscription(userId);
    if (!sub.paystackSubscriptionCode)
        throw new errors_1.AppError("No billing account found", 400);
    const result = await paystack.getSubscriptionManageLink(sub.paystackSubscriptionCode);
    return result.link;
}
async function handleChargeSuccess(data) {
    const userId = data.metadata?.userId;
    const planCode = data.plan?.plan_code ?? data.plan_object?.plan_code;
    if (!userId || !planCode)
        return;
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user)
        return;
    const periodEnd = data.plan_object?.next_payment_date ? new Date(data.plan_object.next_payment_date) : null;
    const customerCode = data.customer?.customer_code;
    const subscriptionCode = data.subscription?.subscription_code ?? undefined;
    if (data.metadata?.type === "merchant") {
        const resolved = (0, plan_1.merchantPlanCodeToTier)(planCode);
        const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
        if (!profile)
            return;
        const renewal = profile.planStatus === "ACTIVE" && profile.planTier === (resolved?.tier ?? "NONE");
        await prisma_1.prisma.bizProfile.update({
            where: { userId },
            data: {
                planTier: resolved?.tier ?? "NONE",
                planStatus: "ACTIVE",
                paystackCustomerCode: customerCode,
                paystackSubscriptionCode: subscriptionCode,
                currentPeriodEnd: periodEnd ?? undefined,
            },
        });
        if (renewal)
            return;
        await (0, notification_service_1.createNotification)(userId, {
            type: "BILLING",
            title: "Merchant plan active",
            message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active. Your dashboard is unlocked.`,
            actionUrl: "/merchant/dashboard",
        });
        if (user.email && periodEnd) {
            await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, { planName: `Merchant ${resolved?.tier ?? "plan"}`, interval: resolved?.interval === "year" ? "year" : "month", periodEnd });
        }
        return;
    }
    const resolved = (0, plan_1.planCodeToTier)(planCode);
    const existing = await prisma_1.prisma.subscription.findUnique({ where: { userId } });
    const renewal = !!existing && existing.status === "ACTIVE" && existing.tier === (resolved?.tier ?? "FREE");
    await prisma_1.prisma.subscription.upsert({
        where: { userId },
        update: {
            tier: resolved?.tier ?? "FREE",
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            billingInterval: resolved?.interval,
            paystackCustomerCode: customerCode,
            paystackSubscriptionCode: subscriptionCode,
            currentPeriodEnd: periodEnd ?? undefined,
        },
        create: {
            userId,
            tier: resolved?.tier ?? "FREE",
            status: "ACTIVE",
            billingInterval: resolved?.interval,
            paystackCustomerCode: customerCode,
            paystackSubscriptionCode: subscriptionCode,
            currentPeriodEnd: periodEnd ?? undefined,
        },
    });
    if (renewal)
        return;
    await (0, notification_service_1.createNotification)(userId, {
        type: "BILLING",
        title: "Subscription active",
        message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
        actionUrl: "/app/billing",
    });
    if (user.email && periodEnd) {
        await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, { planName: resolved?.tier ?? "plan", interval: resolved?.interval === "year" ? "year" : "month", periodEnd });
    }
}
async function handleSubscriptionCreate(data) {
    const email = String(data.customer?.email ?? "").trim();
    const planCode = data.plan?.plan_code;
    const subscriptionCode = data.subscription_code;
    if (!email || !planCode || !subscriptionCode)
        return;
    const user = await prisma_1.prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (!user)
        return;
    const periodEnd = data.next_payment_date ? new Date(data.next_payment_date) : undefined;
    const customerCode = data.customer?.customer_code;
    if ((0, plan_1.merchantPlanCodeToTier)(planCode)) {
        await prisma_1.prisma.bizProfile.updateMany({
            where: { userId: user.id },
            data: { paystackSubscriptionCode: subscriptionCode, paystackCustomerCode: customerCode, currentPeriodEnd: periodEnd },
        });
        return;
    }
    const resolved = (0, plan_1.planCodeToTier)(planCode);
    if (!resolved)
        return;
    await prisma_1.prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
            tier: resolved.tier,
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            billingInterval: resolved.interval,
            paystackSubscriptionCode: subscriptionCode,
            paystackCustomerCode: customerCode,
            currentPeriodEnd: periodEnd,
        },
        create: {
            userId: user.id,
            tier: resolved.tier,
            status: "ACTIVE",
            billingInterval: resolved.interval,
            paystackSubscriptionCode: subscriptionCode,
            paystackCustomerCode: customerCode,
            currentPeriodEnd: periodEnd,
        },
    });
}
async function handleNotRenewing(data) {
    const code = data.subscription_code;
    if (code)
        await prisma_1.prisma.subscription.updateMany({ where: { paystackSubscriptionCode: code }, data: { cancelAtPeriodEnd: true } });
}
async function handleDisable(data) {
    const code = data.subscription_code;
    if (!code)
        return;
    const toolSub = await prisma_1.prisma.subscription.findFirst({ where: { paystackSubscriptionCode: code } });
    if (toolSub) {
        await prisma_1.prisma.subscription.update({
            where: { id: toolSub.id },
            data: { tier: "FREE", status: "CANCELED", cancelAtPeriodEnd: false, billingInterval: null, paystackSubscriptionCode: null },
        });
        return;
    }
    await prisma_1.prisma.bizProfile.updateMany({ where: { paystackSubscriptionCode: code }, data: { planTier: "NONE", planStatus: "INACTIVE", paystackSubscriptionCode: null } });
}
async function handlePaymentFailed(data) {
    const code = data.subscription?.subscription_code;
    if (!code)
        return;
    const updated = await prisma_1.prisma.subscription.updateMany({ where: { paystackSubscriptionCode: code }, data: { status: "PAST_DUE" } });
    if (updated.count === 0)
        await prisma_1.prisma.bizProfile.updateMany({ where: { paystackSubscriptionCode: code }, data: { planStatus: "PAST_DUE" } });
}
async function handleWebhookEvent(event) {
    switch (event.event) {
        case "charge.success":
            return handleChargeSuccess(event.data);
        case "subscription.create":
            return handleSubscriptionCreate(event.data);
        case "subscription.not_renew":
            return handleNotRenewing(event.data);
        case "subscription.disable":
            return handleDisable(event.data);
        case "invoice.payment_failed":
            return handlePaymentFailed(event.data);
    }
}
