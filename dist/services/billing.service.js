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
async function handleWebhookEvent(event) {
    switch (event.event) {
        case "charge.success": {
            const data = event.data;
            const userId = data.metadata?.userId;
            const type = data.metadata?.type;
            const planCode = data.plan?.plan_code ?? data.plan_object?.plan_code;
            if (!userId || !planCode)
                break;
            const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
            const periodEnd = data.plan_object?.next_payment_date ? new Date(data.plan_object.next_payment_date) : null;
            if (type === "merchant") {
                const resolved = (0, plan_1.merchantPlanCodeToTier)(planCode);
                const updated = await prisma_1.prisma.bizProfile.update({
                    where: { userId },
                    data: {
                        planTier: resolved?.tier ?? "NONE",
                        planStatus: "ACTIVE",
                        paystackCustomerCode: data.customer?.customer_code,
                        paystackSubscriptionCode: data.subscription?.subscription_code ?? undefined,
                        currentPeriodEnd: periodEnd ?? undefined,
                    },
                });
                await (0, notification_service_1.createNotification)(userId, {
                    type: "BILLING",
                    title: "Merchant plan active",
                    message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active — your dashboard is unlocked.`,
                    actionUrl: "/merchant/dashboard",
                });
                if (user?.email && periodEnd) {
                    await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, {
                        planName: `Merchant ${resolved?.tier ?? "plan"}`,
                        interval: resolved?.interval === "year" ? "year" : "month",
                        periodEnd,
                    });
                }
            }
            else {
                const resolved = (0, plan_1.planCodeToTier)(planCode);
                await prisma_1.prisma.subscription.update({
                    where: { userId },
                    data: {
                        tier: resolved?.tier ?? "FREE",
                        status: "ACTIVE",
                        paystackCustomerCode: data.customer?.customer_code,
                        paystackSubscriptionCode: data.subscription?.subscription_code ?? undefined,
                        currentPeriodEnd: periodEnd ?? undefined,
                    },
                });
                await (0, notification_service_1.createNotification)(userId, {
                    type: "BILLING",
                    title: "Subscription active",
                    message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
                    actionUrl: "/app/billing",
                });
                if (user?.email && periodEnd) {
                    await (0, email_service_1.sendSubscriptionConfirmationEmail)(user.email, {
                        planName: resolved?.tier ?? "plan",
                        interval: resolved?.interval === "year" ? "year" : "month",
                        periodEnd,
                    });
                }
            }
            break;
        }
        case "subscription.disable": {
            const data = event.data;
            const subscriptionCode = data.subscription_code;
            const toolSub = await prisma_1.prisma.subscription.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
            if (toolSub) {
                await prisma_1.prisma.subscription.update({ where: { id: toolSub.id }, data: { tier: "FREE", status: "CANCELED", paystackSubscriptionCode: null } });
                break;
            }
            const bizProfile = await prisma_1.prisma.bizProfile.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
            if (bizProfile) {
                await prisma_1.prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planTier: "NONE", planStatus: "INACTIVE", paystackSubscriptionCode: null } });
            }
            break;
        }
        case "invoice.payment_failed": {
            const data = event.data;
            const subscriptionCode = data.subscription?.subscription_code;
            if (!subscriptionCode)
                break;
            const toolSub = await prisma_1.prisma.subscription.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
            if (toolSub) {
                await prisma_1.prisma.subscription.update({ where: { id: toolSub.id }, data: { status: "PAST_DUE" } });
                break;
            }
            const bizProfile = await prisma_1.prisma.bizProfile.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
            if (bizProfile) {
                await prisma_1.prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planStatus: "PAST_DUE" } });
            }
            break;
        }
    }
}
