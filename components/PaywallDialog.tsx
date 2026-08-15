"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateCheckout } from "@/lib/hooks/use-life-data";

const PLANS = [
  {
    key: "STARTER" as const,
    name: "Starter",
    price: "$7/mo",
    desc: "For light, regular use.",
    icon: Zap,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
    ring: "hover:border-sky-400/40",
  },
  {
    key: "PRO" as const,
    name: "Pro",
    price: "$15/mo",
    desc: "Unlimited across all tools.",
    icon: Sparkles,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    ring: "hover:border-violet-400/40",
    badge: "Most popular",
  },
  {
    key: "PREMIUM" as const,
    name: "Premium",
    price: "$29/mo",
    desc: "Pro + priority processing.",
    icon: Crown,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    ring: "hover:border-amber-400/40",
  },
];

export function PaywallDialog({ open, onOpenChange, toolName }: { open: boolean; onOpenChange: (o: boolean) => void; toolName: string }) {
  const checkout = useCreateCheckout();

  async function handleSelect(plan: "STARTER" | "PRO" | "PREMIUM") {
    const url = await checkout.mutateAsync({ plan, interval: "month" });
    window.location.href = url;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> You've used your free {toolName} credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Subscribe to keep using {toolName} without limits.</p>
          {PLANS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => handleSelect(p.key)}
                disabled={checkout.isPending}
                className={cn(
                  "relative w-full flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-3 text-left transition-colors",
                  p.ring
                )}
              >
                {p.badge && (
                  <span className="absolute -top-2 right-3 rounded-full bg-violet-500 px-2 py-0.5 text-[9px] font-semibold text-white">
                    {p.badge}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", p.iconBg)}>
                    <Icon className={cn("h-4 w-4", p.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold">{p.price}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
