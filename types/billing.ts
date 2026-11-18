export type PlanKey = "STARTER" | "PRO" | "PREMIUM";

export interface BillingPlan {
  name: string;
  priceLabelMonthly: string;
  priceLabelYearly: string;
  description: string;
}

export interface BillingSummary {
  tier: "FREE" | PlanKey;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  isPaid: boolean;
  billingInterval: "month" | "year" | null;
  freeUsesPerTool: number;
  usage: { AI_WRITING: number; AI_IMAGE: number; FILE_CONVERTER: number };
  plans: Record<PlanKey, BillingPlan>;
}