import { env } from "./env";

export const FREE_USES_PER_TOOL = 3;

export const PLANS = {
  STARTER: {
    name: "Starter",
    planCodeMonthly: env.PAYSTACK_PLAN_STARTER_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_STARTER_YEARLY,
    priceLabelMonthly: "₦1,000/mo",
    priceLabelYearly: "₦10,000/yr",
    description: "For light, regular use across all tools.",
  },
  PRO: {
    name: "Pro",
    planCodeMonthly: env.PAYSTACK_PLAN_PRO_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_PRO_YEARLY,
    priceLabelMonthly: "₦2,500/mo",
    priceLabelYearly: "₦25,000/yr",
    description: "Unlimited AI writing, image tools, and conversions.",
  },
  PREMIUM: {
    name: "Premium",
    planCodeMonthly: env.PAYSTACK_PLAN_PREMIUM_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_PREMIUM_YEARLY,
    priceLabelMonthly: "₦4,500/mo",
    priceLabelYearly: "₦45,000/yr",
    description: "Everything in Pro, plus priority processing.",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingInterval = "month" | "year";

export function planCodeToTier(planCode: string): { tier: PlanKey; interval: BillingInterval } | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.planCodeMonthly === planCode) return { tier: key as PlanKey, interval: "month" };
    if (plan.planCodeYearly === planCode) return { tier: key as PlanKey, interval: "year" };
  }
  return null;
}

export const MERCHANT_PLANS = {
  STARTER: {
    name: "Merchant Starter",
    planCodeMonthly: env.PAYSTACK_PLAN_MERCHANT_STARTER_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_MERCHANT_STARTER_YEARLY,
    priceLabelMonthly: "₦2,000/mo",
    priceLabelYearly: "₦20,000/yr",
    description: "Up to 50 products, 1 staff seat, core POS tools.",
    staffLimit: 1,
  },
  GROWTH: {
    name: "Merchant Growth",
    planCodeMonthly: env.PAYSTACK_PLAN_MERCHANT_GROWTH_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_MERCHANT_GROWTH_YEARLY,
    priceLabelMonthly: "₦5,000/mo",
    priceLabelYearly: "₦50,000/yr",
    description: "Unlimited products, 5 staff seats, customer CRM.",
    staffLimit: 5,
  },
  PRO: {
    name: "Merchant Pro",
    planCodeMonthly: env.PAYSTACK_PLAN_MERCHANT_PRO_MONTHLY,
    planCodeYearly: env.PAYSTACK_PLAN_MERCHANT_PRO_YEARLY,
    priceLabelMonthly: "₦10,000/mo",
    priceLabelYearly: "₦100,000/yr",
    description: "Unlimited staff, priority support, advanced reports.",
    staffLimit: Infinity,
  },
} as const;

export type MerchantPlanKey = keyof typeof MERCHANT_PLANS;

export function merchantPlanCodeToTier(planCode: string): { tier: MerchantPlanKey; interval: BillingInterval } | null {
  for (const [key, plan] of Object.entries(MERCHANT_PLANS)) {
    if (plan.planCodeMonthly === planCode) return { tier: key as MerchantPlanKey, interval: "month" };
    if (plan.planCodeYearly === planCode) return { tier: key as MerchantPlanKey, interval: "year" };
  }
  return null;
}