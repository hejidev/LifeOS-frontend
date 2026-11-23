"use client";

import { useState } from "react";
import { Check, Crown, Sparkles, Store, Zap, type LucideIcon } from "lucide-react";
import { CtaButton } from "@/components/marketing/cta";
import { seatText, yearlySavings, type MerchantPlanKey, type PlanInfo, type PublicPlans, type UserPlanKey } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

const USER_ORDER: UserPlanKey[] = ["STARTER", "PRO", "PREMIUM"];
const MERCHANT_ORDER: MerchantPlanKey[] = ["STARTER", "GROWTH", "PRO"];

const USER_LOOK: Record<UserPlanKey, { icon: LucideIcon; tint: string; badge?: string }> = {
  STARTER: { icon: Zap, tint: "bg-sky-500/10 text-sky-500" },
  PRO: { icon: Sparkles, tint: "bg-violet-500/10 text-violet-500", badge: "Recommended" },
  PREMIUM: { icon: Crown, tint: "bg-amber-500/10 text-amber-500" },
};

const MERCHANT_LOOK: Record<MerchantPlanKey, { tint: string; badge?: string }> = {
  STARTER: { tint: "bg-sky-500/10 text-sky-500" },
  GROWTH: { tint: "bg-violet-500/10 text-violet-500", badge: "Recommended" },
  PRO: { tint: "bg-amber-500/10 text-amber-500" },
};

function Price({ label }: { label: string }) {
  const [amount, unit] = label.split("/");
  return (
    <p className="text-3xl font-bold tracking-tight">
      {amount}
      {unit && <span className="text-sm font-medium text-muted-foreground">/{unit}</span>}
    </p>
  );
}

function PlanCard({ name, price, note, description, features, badge, icon: Icon, tint, cta, highlight }: {
  name: string; price: string; note?: string | null; description: string; features: string[]; badge?: string;
  icon: LucideIcon; tint: string; cta: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={cn("relative flex flex-col gap-5 rounded-2xl border bg-card p-6", highlight && "border-primary/60 ring-1 ring-primary/30")}>
      {badge && <span className="absolute -top-2.5 right-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{badge}</span>}
      <div className="space-y-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tint)}><Icon className="h-4 w-4" /></span>
        <p className="text-base font-semibold">{name}</p>
        <div>
          {price === "Free" ? <p className="text-3xl font-bold tracking-tight">Free</p> : <Price label={price} />}
          {note && <p className="mt-1 text-xs font-medium text-emerald-600">{note}</p>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {feature}</li>)}
      </ul>
      {cta}
    </div>
  );
}

export function PricingView({ plans }: { plans: PublicPlans | null }) {
  const [audience, setAudience] = useState<"you" | "business">("you");
  const [cycle, setCycle] = useState<"month" | "year">("month");

  if (!plans) {
    return <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Pricing is temporarily unavailable. Please refresh in a moment.</p>;
  }

  const saving = yearlySavings(audience === "you" ? plans.user.STARTER : plans.merchant.STARTER);
  const priceOf = (plan: PlanInfo) => (cycle === "year" ? plan.priceLabelYearly : plan.priceLabelMonthly);
  const noteOf = (plan: PlanInfo) => (cycle === "year" ? yearlySavings(plan) : null);

  const freeFeatures = [
    "Tasks, notes, calendar, goals, habits and health",
    "Finance, study and career",
    "Documents, password vault, family space and emergency profile",
    `${plans.freeUsesPerTool} free uses on each AI tool`,
    "AI assistant and daily brief",
    "Download your data any time",
  ];
  const paidFeatures = ["Everything in Free", "Unlimited AI Writing", "Unlimited Image Tools", "Unlimited File Conversion", "Manage or cancel any time"];

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex rounded-full border bg-card p-1">
          {([["you", "For you"], ["business", "For your business"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setAudience(key)} className={cn("rounded-full px-5 py-1.5 text-sm font-semibold transition-colors", audience === key ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        <div className="inline-flex rounded-full border bg-card p-1">
          {(["month", "year"] as const).map((key) => (
            <button key={key} type="button" onClick={() => setCycle(key)} className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", cycle === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {key === "month" ? "Monthly" : "Yearly"}
              {key === "year" && saving && <span className="text-[10px] opacity-90">{saving}</span>}
            </button>
          ))}
        </div>
      </div>

      {audience === "you" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlanCard name="Free" price="Free" description="Everything you need to run your life. No card needed." features={freeFeatures} icon={Sparkles} tint="bg-primary/10 text-primary" cta={<CtaButton guest="/signup" member="/app/dashboard" variant="outline" className="w-full">Get started</CtaButton>} />
          {USER_ORDER.map((key) => {
            const plan = plans.user[key];
            const look = USER_LOOK[key];
            return <PlanCard key={key} name={plan.name} price={priceOf(plan)} note={noteOf(plan)} description={plan.description} features={paidFeatures} badge={look.badge} highlight={!!look.badge} icon={look.icon} tint={look.tint} cta={<CtaButton guest="/signup" member="/app/billing" variant={look.badge ? "default" : "outline"} className="w-full">Choose {plan.name}</CtaButton>} />;
          })}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {MERCHANT_ORDER.map((key) => {
              const plan = plans.merchant[key];
              const look = MERCHANT_LOOK[key];
              return <PlanCard key={key} name={plan.name} price={priceOf(plan)} note={noteOf(plan)} description={plan.description} features={[seatText(plan.staffLimit), "POS, stock and staff terminals", "Works offline, on web and Android"]} badge={look.badge} highlight={!!look.badge} icon={Store} tint={look.tint} cta={<CtaButton guest="/signup" member="/app/merchant/apply" variant={look.badge ? "default" : "outline"} className="w-full">Apply as a merchant</CtaButton>} />;
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground">Merchant applications are reviewed first. After approval, you choose a plan to activate your dashboard.</p>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">Prices are in Naira. Payments are processed securely by Paystack.</p>
    </div>
  );
}