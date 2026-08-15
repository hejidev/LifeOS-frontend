"use client";

import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchantStatus, useMerchantBillingPortal } from "@/lib/hooks/use-life-data";
import { MerchantPlanPicker } from "@/components/merchant/merchant-plan-picker";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function MerchantBillingPage() {
  const { data: status, isLoading } = useMerchantStatus();
  const portal = useMerchantBillingPortal();

  if (isLoading || !status) return <Skeleton className="h-80 sm:h-96 rounded-xl" />;
  const s = status as any;

  async function handleManage() {
    const url = await portal.mutateAsync();
    window.location.href = url;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 px-1">
      <motion.div variants={item}>
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> Merchant Billing
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage your merchant subscription plan.</p>
      </motion.div>

      {s.planStatus === "ACTIVE" ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-5 sm:pt-6 space-y-3">
              <p className="text-sm">Current plan: <span className="font-semibold capitalize">{s.planTier.toLowerCase()}</span></p>
              <p className="text-xs text-muted-foreground">
                Billed {s.billingInterval === "YEAR" ? "yearly" : "monthly"} - renews {new Date(s.currentPeriodEnd).toLocaleDateString()}
              </p>
              <Button size="sm" variant="outline" onClick={handleManage} disabled={portal.isPending} className="w-full sm:w-auto">
                {portal.isPending ? "Loading..." : "Manage subscription"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <MerchantPlanPicker />
        </motion.div>
      )}
    </motion.div>
  );
}