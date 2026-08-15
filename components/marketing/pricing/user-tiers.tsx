"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  { key: "FREE", name: "Free", priceMonthly: "$0", priceYearly: "$0", desc: "Full LifeOS core — tasks, notes, health, finance, and more.", features: ["Unlimited tasks & notes", "Finance & budget tracking", "3 free uses per AI tool"] },
  { key: "STARTER", name: "Starter", priceMonthly: "$7/mo", priceYearly: "$57/yr", desc: "Light, regular AI tool use.", features: ["Everything in Free", "More AI Writing credits", "More Image Tool credits"] },
  { key: "PRO", name: "Pro", priceMonthly: "$15/mo", priceYearly: "$94/yr", desc: "Unlimited AI tools.", features: ["Everything in Starter", "Unlimited AI Writing", "Unlimited Image Tools & Conversions"], popular: true },
];

export function UserPricingTiers() {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
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
                  <Link href="/signup">Get started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}