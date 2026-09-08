"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_PLANS = exports.PLANS = exports.FREE_USES_PER_TOOL = void 0;
exports.planCodeToTier = planCodeToTier;
exports.merchantPlanCodeToTier = merchantPlanCodeToTier;
const env_1 = require("./env");
exports.FREE_USES_PER_TOOL = 3;
exports.PLANS = {
    STARTER: {
        name: "Starter",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_STARTER_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_STARTER_YEARLY,
        priceLabelMonthly: "₦1,000/mo",
        priceLabelYearly: "₦10,000/yr",
        description: "For light, regular use across all tools.",
    },
    PRO: {
        name: "Pro",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_PRO_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_PRO_YEARLY,
        priceLabelMonthly: "₦2,500/mo",
        priceLabelYearly: "₦25,000/yr",
        description: "Unlimited AI writing, image tools, and conversions.",
    },
    PREMIUM: {
        name: "Premium",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_PREMIUM_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_PREMIUM_YEARLY,
        priceLabelMonthly: "₦4,500/mo",
        priceLabelYearly: "₦45,000/yr",
        description: "Everything in Pro, plus priority processing.",
    },
};
function planCodeToTier(planCode) {
    for (const [key, plan] of Object.entries(exports.PLANS)) {
        if (plan.planCodeMonthly === planCode)
            return { tier: key, interval: "month" };
        if (plan.planCodeYearly === planCode)
            return { tier: key, interval: "year" };
    }
    return null;
}
exports.MERCHANT_PLANS = {
    STARTER: {
        name: "Merchant Starter",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_MERCHANT_STARTER_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_MERCHANT_STARTER_YEARLY,
        priceLabelMonthly: "₦2,000/mo",
        priceLabelYearly: "₦20,000/yr",
        description: "Up to 50 products, 1 staff seat, core POS tools.",
        staffLimit: 1,
    },
    GROWTH: {
        name: "Merchant Growth",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_MERCHANT_GROWTH_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_MERCHANT_GROWTH_YEARLY,
        priceLabelMonthly: "₦5,000/mo",
        priceLabelYearly: "₦50,000/yr",
        description: "Unlimited products, 5 staff seats, customer CRM.",
        staffLimit: 5,
    },
    PRO: {
        name: "Merchant Pro",
        planCodeMonthly: env_1.env.PAYSTACK_PLAN_MERCHANT_PRO_MONTHLY,
        planCodeYearly: env_1.env.PAYSTACK_PLAN_MERCHANT_PRO_YEARLY,
        priceLabelMonthly: "₦10,000/mo",
        priceLabelYearly: "₦100,000/yr",
        description: "Unlimited staff, priority support, advanced reports.",
        staffLimit: Infinity,
    },
};
function merchantPlanCodeToTier(planCode) {
    for (const [key, plan] of Object.entries(exports.MERCHANT_PLANS)) {
        if (plan.planCodeMonthly === planCode)
            return { tier: key, interval: "month" };
        if (plan.planCodeYearly === planCode)
            return { tier: key, interval: "year" };
    }
    return null;
}
