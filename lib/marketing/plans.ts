export type UserPlanKey = "STARTER" | "PRO" | "PREMIUM";
export type MerchantPlanKey = "STARTER" | "GROWTH" | "PRO";

export interface PlanInfo {
  name: string;
  priceLabelMonthly: string;
  priceLabelYearly: string;
  description: string;
  staffLimit?: number | null;
}

export interface PublicPlans {
  freeUsesPerTool: number;
  user: Record<UserPlanKey, PlanInfo>;
  merchant: Record<MerchantPlanKey, PlanInfo>;
}

function apiBase() {
  const found = [process.env.API_ORIGIN, process.env.NEXT_PUBLIC_API_URL].find((value) => value && /^https?:\/\//i.test(value)) ?? "https://api.lifeos.com.ng";
  const trimmed = found.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export async function getPublicPlans(): Promise<PublicPlans | null> {
  try {
    const res = await fetch(`${apiBase()}/public/plans`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as PublicPlans) : null;
  } catch {
    return null;
  }
}

export function priceValue(label: string) {
  const digits = label.replace(/[^\d.]/g, "");
  const value = Number(digits);
  return digits && Number.isFinite(value) ? value : null;
}

export function yearlySavings(plan: PlanInfo) {
  const monthly = priceValue(plan.priceLabelMonthly);
  const yearly = priceValue(plan.priceLabelYearly);
  if (!monthly || !yearly || yearly >= monthly * 12) return null;

  const freeMonths = (monthly * 12 - yearly) / monthly;
  const rounded = Math.round(freeMonths);
  if (rounded >= 1 && Math.abs(freeMonths - rounded) < 0.05) return `${rounded} ${rounded === 1 ? "month" : "months"} free`;
  return `Save ${Math.round((1 - yearly / (monthly * 12)) * 100)}%`;
}

export const seatText = (limit?: number | null) => (limit == null ? "Unlimited staff seats" : `${limit} staff ${limit === 1 ? "seat" : "seats"}`);