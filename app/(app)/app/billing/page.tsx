"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CreditCard, Crown, FileCog, ImageIcon, Loader2, PenTool, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, ProgressBar, Section } from "@/components/app/kit";
import { useBillingPortal, useBillingSummary, useCreateCheckout } from "@/lib/hooks/use-billing";
import { cn } from "@/lib/utils";
import type { PlanKey } from "@/types/billing";

const ORDER: PlanKey[] = ["STARTER", "PRO", "PREMIUM"];

const META: Record<PlanKey, { icon: typeof Zap; tint: string; badge?: string }> = {
  STARTER: { icon: Zap, tint: "bg-sky-500/10 text-sky-500" },
  PRO: { icon: Sparkles, tint: "bg-violet-500/10 text-violet-500", badge: "Most popular" },
  PREMIUM: { icon: Crown, tint: "bg-amber-500/10 text-amber-500" },
};

const TOOLS = [
  { key: "AI_WRITING", label: "AI Writing", icon: PenTool },
  { key: "AI_IMAGE", label: "Image Tools", icon: ImageIcon },
  { key: "FILE_CONVERTER", label: "File Converter", icon: FileCog },
] as const;

const date = (value?: string) => (value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "");

export default function BillingPage() {
  const { data: billing, isLoading, isError, refetch } = useBillingSummary();
  const checkout = useCreateCheckout();
  const portal = useBillingPortal();
  const [cycle, setCycle] = useState<"month" | "year">("month");
  const [returned, setReturned] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReturned(new URLSearchParams(window.location.search).get("success") === "true");
  }, []);

  useEffect(() => {
    if (!returned || billing?.isPaid || attempts >= 10) return;
    const timer = setTimeout(() => {
      void refetch();
      setAttempts((count) => count + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [returned, billing?.isPaid, attempts, refetch]);

  useEffect(() => {
    if (returned && billing?.isPaid) window.history.replaceState(null, "", "/app/billing");
  }, [returned, billing?.isPaid]);

  async function subscribe(plan: PlanKey) {
    setError(null);
    try {
      window.location.href = await checkout.mutateAsync({ plan, interval: cycle });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function manage() {
    setError(null);
    try {
      window.location.href = await portal.mutateAsync();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (isError && !billing) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your billing details.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !billing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-xl" />)}</div>
      </div>
    );
  }

  const hasPlan = billing.tier !== "FREE" && billing.status !== "CANCELED";
  const pastDue = billing.tier !== "FREE" && billing.status === "PAST_DUE";
  const currentName = billing.tier === "FREE" ? "Free" : billing.plans[billing.tier]?.name ?? billing.tier;
  const waiting = returned && !billing.isPaid && attempts < 10;

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} title="Billing" subtitle="Your plan, usage and payment details." />

      {waiting && (
        <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Payment received. Activating your plan...</p>
      )}
      {returned && billing.isPaid && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm"><Check className="h-4 w-4 text-emerald-600" /> Your {currentName} plan is active. Thank you!</p>
      )}
      {returned && !billing.isPaid && attempts >= 10 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">Your payment is taking longer than usual to confirm. It will appear here shortly. If it doesn't, contact support.</p>
      )}
      {pastDue && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> Your last payment failed. Update your payment method to keep your plan.</p>
          <Button size="sm" onClick={manage} disabled={portal.isPending}>Update payment</Button>
        </div>
      )}
      {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Current plan" icon={CreditCard} className="lg:col-span-1">
          <div>
            <p className="text-2xl font-bold">{currentName}</p>
            {hasPlan ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Billed {billing.billingInterval === "year" ? "yearly" : "monthly"}.{" "}
                {billing.currentPeriodEnd && (billing.cancelAtPeriodEnd ? `Ends on ${date(billing.currentPeriodEnd)}. You keep access until then.` : `Renews on ${date(billing.currentPeriodEnd)}.`)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{billing.freeUsesPerTool} free uses on each AI tool.</p>
            )}
          </div>
          {hasPlan && <Button variant="outline" onClick={manage} disabled={portal.isPending}>{portal.isPending ? "Opening..." : "Manage subscription"}</Button>}
        </Section>

        <Section title="Usage" icon={Sparkles} className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            {TOOLS.map((tool) => {
              const used = billing.usage[tool.key];
              const limit = billing.freeUsesPerTool;
              const unlimited = billing.isPaid;
              return (
                <div key={tool.key} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><tool.icon className="h-4 w-4 text-primary" /> {tool.label}</div>
                  {unlimited ? (
                    <p className="text-sm text-emerald-600">Unlimited</p>
                  ) : (
                    <>
                      <ProgressBar value={(used / limit) * 100} tone={used >= limit ? "danger" : used >= limit - 1 ? "warning" : "default"} />
                      <p className="text-xs text-muted-foreground">{Math.max(0, limit - used)} of {limit} free uses left</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {!hasPlan && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border bg-card p-1">
            {(["month", "year"] as const).map((option) => (
              <button key={option} type="button" onClick={() => setCycle(option)} className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", cycle === option ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>
                {option === "month" ? "Monthly" : "Yearly"}
                {option === "year" && <span className="text-[10px] opacity-90">2 months free</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {ORDER.map((key) => {
          const plan = billing.plans[key];
          if (!plan) return null;
          const meta = META[key];
          const Icon = meta.icon;
          const current = hasPlan && billing.tier === key;

          return (
            <div key={key} className={cn("relative space-y-4 rounded-xl border bg-card p-5 transition-colors", current ? "border-primary/60 ring-1 ring-primary/30" : "hover:border-primary/30")}>
              {(meta.badge || current) && (
                <span className={cn("absolute -top-2.5 right-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", current ? "bg-primary text-primary-foreground" : "bg-violet-500 text-white")}>
                  {current && <Check className="h-3 w-3" />} {current ? "Current plan" : meta.badge}
                </span>
              )}
              <div>
                <span className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", meta.tint)}><Icon className="h-4 w-4" /></span>
                <p className="text-base font-semibold">{plan.name}</p>
                <p className="mt-1 text-2xl font-bold">{cycle === "year" ? plan.priceLabelYearly : plan.priceLabelMonthly}</p>
              </div>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
              <ul className="space-y-1.5 text-xs">
                {["Unlimited AI Writing", "Unlimited Image Tools", "Unlimited File Conversion"].map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> {feature}</li>
                ))}
              </ul>
              {current ? (
                <Button className="w-full" variant="outline" disabled>Current plan</Button>
              ) : hasPlan ? (
                <Button className="w-full" variant="outline" onClick={manage} disabled={portal.isPending}>Change in billing portal</Button>
              ) : (
                <Button className="w-full" onClick={() => subscribe(key)} disabled={checkout.isPending}>{checkout.isPending ? "Redirecting..." : "Subscribe"}</Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">Payments are processed securely by Paystack. You can cancel any time from the billing portal.</p>
    </div>
  );
}