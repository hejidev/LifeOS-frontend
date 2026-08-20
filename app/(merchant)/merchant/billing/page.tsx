"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard, Zap, TrendingUp, Crown, Check, Clock, Users,
  ShieldCheck, ArrowRight, AlertTriangle, FileWarning, Ban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMerchantStatus, useMerchantBillingPortal, useMerchantStaff } from "@/lib/hooks/use-life-data";
import { MerchantPlanPicker } from "@/components/merchant/merchant-plan-picker";

const PLAN_META: Record<string, { icon: any; name: string; staffSeats: string; features: string[] }> = {
  STARTER: { icon: Zap, name: "Starter", staffSeats: "1 staff seat", features: ["Up to 50 products", "1 staff seat", "Core POS tools"] },
  GROWTH: { icon: TrendingUp, name: "Growth", staffSeats: "5 staff seats", features: ["Unlimited products", "5 staff seats", "Customer CRM"] },
  PRO: { icon: Crown, name: "Pro", staffSeats: "Unlimited staff", features: ["Unlimited products", "Unlimited staff", "Priority support"] },
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MerchantBillingPage() {
  const { data: status, isLoading } = useMerchantStatus();
  const { data: staff = [] } = useMerchantStaff();
  const portal = useMerchantBillingPortal();

  const s = status as any;
  const daysLeft = useMemo(() => (s?.currentPeriodEnd ? daysUntil(s.currentPeriodEnd) : null), [s?.currentPeriodEnd]);

  async function handleManage() {
    const url = await portal.mutateAsync();
    window.location.href = url;
  }

  if (isLoading || !status) return <Skeleton className="h-80 sm:h-96 rounded-xl" />;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 h-95 w-125 rounded-full bg-primary/10 blur-3xl" />

      <motion.div variants={container} initial="hidden" animate="show" className="relative space-y-6 max-w-8xl">
        <motion.div variants={item}>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <div className="p-2 bg-linear-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            Billing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your merchant subscription plan.</p>
        </motion.div>

        {s.status === "NONE" && (
          <motion.div variants={item}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><ShieldCheck className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">You haven't applied as a merchant yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Apply and get verified to unlock billing.</p>
                  </div>
                </div>
                <Button size="sm" asChild><Link href="/merchant/apply">Apply now <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {s.status === "PENDING" && (
          <motion.div variants={item}>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 shrink-0"><Clock className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Your application is under review</p>
                  <p className="text-xs text-amber-700 mt-0.5">Billing unlocks automatically once your business is approved.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {s.status === "REJECTED" && (
          <motion.div variants={item}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0"><FileWarning className="h-5 w-5 text-destructive" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Your application wasn't approved</p>
                  {s.rejectionReason && <p className="text-xs text-muted-foreground mt-1">Reason: {s.rejectionReason}</p>}
                  <Button size="sm" variant="outline" className="mt-3" asChild><Link href="/merchant/apply">Submit a new application</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {s.status === "SUSPENDED" && (
          <motion.div variants={item}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0"><Ban className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-sm font-medium">Your merchant account is suspended</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Contact support to resolve this before billing is available.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {s.status === "APPROVED" && s.planStatus === "ACTIVE" && (
          <>
            <motion.div variants={item}>
              <Card className="border-primary/10 shadow-xl shadow-black/5 overflow-hidden">
                <div className="h-1.5 gradient-bg" />
                <CardContent className="pt-6 space-y-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        {(() => {
                          const Icon = PLAN_META[s.planTier]?.icon ?? Zap;
                          return <Icon className="h-6 w-6 text-primary" />;
                        })()}
                      </div>
                      <div>
                        <p className="text-xl font-bold">{PLAN_META[s.planTier]?.name ?? s.planTier} plan</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            Billed {s.billingInterval === "YEAR" ? "yearly" : "monthly"}
                          </Badge>
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                            <Check className="h-2.5 w-2.5 mr-1" /> Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleManage} disabled={portal.isPending}>
                      {portal.isPending ? "Loading..." : "Manage subscription"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Renews in</p>
                      <p className="text-lg font-semibold mt-0.5">{daysLeft != null ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.currentPeriodEnd).toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Staff seats</p>
                      <p className="text-lg font-semibold mt-0.5">{staff.length}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{PLAN_META[s.planTier]?.staffSeats ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/60 p-3 col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Merchant since</p>
                      <p className="text-sm font-semibold mt-0.5">{s.reviewedAt ? new Date(s.reviewedAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What's included</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(PLAN_META[s.planTier]?.features ?? []).map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-4">
                    Full invoice history, payment methods, and cancellation are available in the secure billing portal.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {s.status === "APPROVED" && s.planStatus === "PAST_DUE" && (
          <motion.div variants={item}>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 shrink-0"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">Your last payment failed</p>
                    <p className="text-xs text-amber-700 mt-0.5">Update your payment method to keep your dashboard active.</p>
                  </div>
                </div>
                <Button size="sm" onClick={handleManage} disabled={portal.isPending}>
                  {portal.isPending ? "Loading..." : "Update payment method"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {s.status === "APPROVED" && (s.planStatus === "INACTIVE" || s.planStatus === "CANCELED") && (
          <motion.div variants={item}>
            <MerchantPlanPicker />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}