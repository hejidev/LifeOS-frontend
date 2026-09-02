"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, Zap, Sparkles, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBillingSummary, useCreateCheckout, useBillingPortal } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PLAN_META: Record<string, { icon: any; ring: string; iconBg: string; iconColor: string; badge?: string }> = {
  STARTER: { icon: Zap, ring: "hover:border-sky-400/40", iconBg: "bg-sky-500/10", iconColor: "text-sky-500" },
  PRO: { icon: Sparkles, ring: "hover:border-violet-400/40", iconBg: "bg-violet-500/10", iconColor: "text-violet-500", badge: "Most popular" },
  PREMIUM: { icon: Crown, ring: "hover:border-amber-400/40", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
};

export default function BillingPage() {
  const { data: billing, isLoading } = useBillingSummary();
  const checkout = useCreateCheckout();
  const portal = useBillingPortal();
  const [interval, setInterval] = useState<"month" | "year">("month");

  if (isLoading || !billing) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  const b = billing as any;

  async function handleUpgrade(plan: "STARTER" | "PRO" | "PREMIUM") {
    const url = await checkout.mutateAsync({ plan, interval });
    window.location.href = url;
  }

  async function handleManage() {
    const url = await portal.mutateAsync();
    window.location.href = url;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Billing</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Manage your subscription and see your tool usage.</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Current plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xl sm:text-2xl font-bold capitalize">{b.tier.toLowerCase()}</p>
            {b.isPaid ? (
              <>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Billed {b.billingInterval === "YEAR" ? "yearly" : "monthly"} - {b.cancelAtPeriodEnd ? "cancels" : "renews"} on {new Date(b.currentPeriodEnd).toLocaleDateString()}
                </p>
                <Button size="sm" variant="outline" onClick={handleManage} disabled={portal.isPending} className="text-xs sm:text-sm">
                  {portal.isPending ? "Loading..." : "Manage subscription"}
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                {["AI_WRITING", "AI_IMAGE", "FILE_CONVERTER"].map((tool) => (
                  <div key={tool} className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{tool.replace("_", " ")}</p>
                    <p className="text-xs sm:text-sm font-semibold">{Math.max(0, b.freeUsesPerTool - b.usage[tool])} left</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {!b.isPaid && (
        <motion.div variants={item} className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button onClick={() => setInterval("month")} className={cn("rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors", interval === "month" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
            <button onClick={() => setInterval("year")} className={cn("rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5", interval === "year" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>
              Yearly <span className="text-[9px] sm:text-[10px] opacity-80">Save ~20%</span>
            </button>
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {Object.entries(b.plans).map(([key, plan]: [string, any]) => {
          const meta = PLAN_META[key] ?? PLAN_META.STARTER;
          const Icon = meta.icon;
          const isCurrent = b.isPaid && b.tier === key;
          const priceLabel = interval === "year" ? plan.priceLabelYearly : plan.priceLabelMonthly;

          return (
            <Card
              key={key}
              className={cn(
                "relative transition-colors",
                isCurrent ? "border-primary/60 ring-1 ring-primary/30" : `border-border/60 ${meta.ring}`
              )}
            >
              {meta.badge && !isCurrent && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {meta.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Check className="h-3 w-3" /> Current plan
                </span>
              )}
              <CardHeader className="pb-3">
                <div className={cn("mb-2 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg", meta.iconBg)}>
                  <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", meta.iconColor)} />
                </div>
                <CardTitle className="text-sm sm:text-base">{plan.name}</CardTitle>
                <p className="text-xl sm:text-2xl font-bold">{priceLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">{plan.description}</p>
                <ul className="text-[10px] sm:text-xs space-y-1">
                  <li className="flex items-center gap-1"><Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> Unlimited AI Writing</li>
                  <li className="flex items-center gap-1"><Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> Unlimited Image Tools</li>
                  <li className="flex items-center gap-1"><Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> Unlimited File Conversion</li>
                </ul>
                <Button
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || checkout.isPending}
                  onClick={() => handleUpgrade(key as any)}
                >
                  {isCurrent ? "Current plan" : checkout.isPending ? "Loading..." : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
    </motion.div>
  );
}