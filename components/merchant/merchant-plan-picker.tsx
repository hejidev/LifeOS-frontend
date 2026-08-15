"use client";

import { useState } from "react";
import { Zap, TrendingUp, Crown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMerchantCheckout } from "@/lib/hooks/use-life-data";

const PLANS = [
  { key: "STARTER" as const, name: "Starter", priceMonthly: "$5/mo", priceYearly: "$48/yr", desc: "Up to 50 products, 1 staff seat.", icon: Zap, features: ["50 products", "1 staff seat", "Core POS tools"] },
  { key: "GROWTH" as const, name: "Growth", priceMonthly: "$20/mo", priceYearly: "$190/yr", desc: "Unlimited products, 5 staff seats.", icon: TrendingUp, features: ["Unlimited products", "5 staff seats", "Customer CRM"], popular: true },
  { key: "PRO" as const, name: "Pro", priceMonthly: "$30/mo", priceYearly: "$280/yr", desc: "Unlimited everything, priority support.", icon: Crown, features: ["Unlimited staff", "Priority support", "Advanced reports"] },
];

export function MerchantPlanPicker() {
  const checkout = useMerchantCheckout();
  const [interval, setInterval] = useState<"month" | "year">("month");

  async function handleSelect(plan: "STARTER" | "GROWTH" | "PRO") {
    const url = await checkout.mutateAsync({ plan, interval });
    window.location.href = url;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <button onClick={() => setInterval("month")} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", interval === "month" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
          <button onClick={() => setInterval("year")} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors flex items-center gap-1.5", interval === "year" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>
            Yearly <span className="text-[10px] opacity-80">Save ~20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.key} className={cn("relative hover:border-primary/30 transition-colors", p.popular && "border-primary/40")}>
              {p.popular && <span className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Most popular</span>}
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-2xl font-bold">{interval === "year" ? p.priceYearly : p.priceMonthly}</p>
                </div>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
                <ul className="text-xs space-y-1">
                  {p.features.map((f) => <li key={f} className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> {f}</li>)}
                </ul>
                <Button size="sm" className="w-full" onClick={() => handleSelect(p.key)} disabled={checkout.isPending}>
                  {checkout.isPending ? "Loading..." : "Choose plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}