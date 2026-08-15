"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_PLANS = exports.PLANS = exports.FREE_USES_PER_TOOL = void 0;
exports.priceIdToTier = priceIdToTier;
exports.merchantPriceIdToTier = merchantPriceIdToTier;
const env_1 = require("./env");
exports.FREE_USES_PER_TOOL = 3;
exports.PLANS = {
    STARTER: {
        name: "Starter",
        priceIdMonthly: env_1.env.STRIPE_PRICE_STARTER_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_STARTER_YEARLY,
        priceLabelMonthly: "$7/mo",
        priceLabelYearly: "$57/yr",
        description: "For light, regular use across all tools.",
    },
    PRO: {
        name: "Pro",
        priceIdMonthly: env_1.env.STRIPE_PRICE_PRO_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_PRO_YEARLY,
        priceLabelMonthly: "$15/mo",
        priceLabelYearly: "$94/yr",
        description: "Unlimited AI writing, image tools, and conversions.",
    },
    PREMIUM: {
        name: "Premium",
        priceIdMonthly: env_1.env.STRIPE_PRICE_PREMIUM_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_PREMIUM_YEARLY,
        priceLabelMonthly: "$29/mo",
        priceLabelYearly: "$148/yr",
        description: "Everything in Pro, plus priority processing.",
    },
};
function priceIdToTier(priceId) {
    for (const [key, plan] of Object.entries(exports.PLANS)) {
        if (plan.priceIdMonthly === priceId)
            return { tier: key, interval: "month" };
        if (plan.priceIdYearly === priceId)
            return { tier: key, interval: "year" };
    }
    return null;
}
exports.MERCHANT_PLANS = {
    STARTER: {
        name: "Merchant Starter",
        priceIdMonthly: env_1.env.STRIPE_PRICE_MERCHANT_STARTER_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_MERCHANT_STARTER_YEARLY,
        priceLabelMonthly: "$5/mo",
        priceLabelYearly: "$48/yr",
        description: "Up to 50 products, 1 staff seat, core POS tools.",
        staffLimit: 1,
    },
    GROWTH: {
        name: "Merchant Growth",
        priceIdMonthly: env_1.env.STRIPE_PRICE_MERCHANT_GROWTH_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_MERCHANT_GROWTH_YEARLY,
        priceLabelMonthly: "$20/mo",
        priceLabelYearly: "$190/yr",
        description: "Unlimited products, 5 staff seats, customer CRM.",
        staffLimit: 5,
    },
    PRO: {
        name: "Merchant Pro",
        priceIdMonthly: env_1.env.STRIPE_PRICE_MERCHANT_PRO_MONTHLY,
        priceIdYearly: env_1.env.STRIPE_PRICE_MERCHANT_PRO_YEARLY,
        priceLabelMonthly: "$30/mo",
        priceLabelYearly: "$280/yr",
        description: "Unlimited staff, priority support, advanced reports.",
        staffLimit: Infinity,
    },
};
function merchantPriceIdToTier(priceId) {
    for (const [key, plan] of Object.entries(exports.MERCHANT_PLANS)) {
        if (plan.priceIdMonthly === priceId)
            return { tier: key, interval: "month" };
        if (plan.priceIdYearly === priceId)
            return { tier: key, interval: "year" };
    }
    return null;
}
