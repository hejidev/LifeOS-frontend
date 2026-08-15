"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Starter", priceMonthly: "$5/mo", priceYearly: "$48/yr", desc: "Up to 50 products, 1 staff seat.", features: ["POS & inventory", "1 staff seat", "Sales & expense tracking"] },
  { name: "Growth", priceMonthly: "$20/mo", priceYearly: "$190/yr", desc: "Unlimited products, 5 staff seats.", features: ["Everything in Starter", "5 staff seats", "Customer CRM"], popular: true },
  { name: "Pro", priceMonthly: "$30/mo", priceYearly: "$280/yr", desc: "Unlimited everything.", features: ["Everything in Growth", "Unlimited staff", "Priority support"] },
];

export function MerchantPricingTiers() {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-2"><Store className="h-5 w-5 text-primary" /></div>
          <p className="text-sm text-muted-foreground">Applications are reviewed for identity verification before your plan activates — no bots, no fake storefronts.</p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button onClick={() => setInterval("month")} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", interval === "month" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
            <button onClick={() => setInterval("year")} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors flex items-center gap-1.5", interval === "year" ? "gradient-bg text-white" : "text-muted-foreground hover:text-foreground")}>
              Yearly <span className="text-[10px] opacity-80">Save ~20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <Card key={t.name} className={t.popular ? "border-primary/40" : ""}>
              <CardContent className="pt-6 space-y-3">
                <p className="font-semibold">{t.name}</p>
                <p className="text-3xl font-bold">{interval === "year" ? t.priceYearly : t.priceMonthly}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
                <ul className="text-xs space-y-1.5">
                  {t.features.map((f) => <li key={f} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {f}</li>)}
                </ul>
                <Button className="w-full" variant={t.popular ? "default" : "outline"} asChild>
                  <Link href="/merchant/apply">Apply to become a merchant</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}