"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBillingSummary, useCreateCheckout } from "@/lib/hooks/use-billing";
import { cn } from "@/lib/utils";
import type { PlanKey } from "@/types/billing";

const META: Record<PlanKey, { icon: typeof Zap; tint: string; badge?: string }> = {
  STARTER: { icon: Zap, tint: "bg-sky-500/10 text-sky-500" },
  PRO: { icon: Sparkles, tint: "bg-violet-500/10 text-violet-500", badge: "Most popular" },
  PREMIUM: { icon: Crown, tint: "bg-amber-500/10 text-amber-500" },
};

const ORDER: PlanKey[] = ["STARTER", "PRO", "PREMIUM"];

export function PaywallDialog({ open, onOpenChange, toolName }: { open: boolean; onOpenChange: (open: boolean) => void; toolName: string }) {
  const { data: billing } = useBillingSummary();
  const checkout = useCreateCheckout();
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanKey) {
    setError(null);
    try {
      window.location.href = await checkout.mutateAsync({ plan, interval: "month" });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> You've used your free {toolName} credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Subscribe to keep using {toolName} without limits.</p>
          {!billing ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading plans...</p>
          ) : (
            ORDER.map((key) => {
              const plan = billing.plans[key];
              if (!plan) return null;
              const meta = META[key];
              const Icon = meta.icon;
              return (
                <button key={key} type="button" onClick={() => choose(key)} disabled={checkout.isPending} className="relative flex w-full items-center justify-between rounded-lg border bg-card/60 p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60">
                  {meta.badge && <span className="absolute -top-2 right-3 rounded-full bg-violet-500 px-2 py-0.5 text-[9px] font-semibold text-white">{meta.badge}</span>}
                  <span className="flex items-center gap-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tint)}><Icon className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-medium">{plan.name}</span>
                      <span className="block text-xs text-muted-foreground">{plan.description}</span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{plan.priceLabelMonthly}</span>
                </button>
              );
            })
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Link href="/app/billing" className="block text-center text-xs text-primary hover:underline" onClick={() => onOpenChange(false)}>Compare plans and yearly pricing</Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}