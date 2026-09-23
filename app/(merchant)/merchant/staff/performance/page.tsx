"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Trophy, Receipt, UserPlus, RotateCcw, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStaffPerformance } from "@/lib/hooks/use-life-data";
import { useBusinessProfile } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const RANGES: { value: "today" | "week" | "month"; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export default function StaffPerformancePage() {
  const [range, setRange] = useState<"today" | "week" | "month">("month");
  const { data: performance = [], isLoading } = useStaffPerformance(range);
  const { data: profile } = useBusinessProfile();
  const currency = (profile as any)?.currency ?? "NGN";

  const topRevenue = performance[0]?.revenue ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-linear-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Staff Performance</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Sales rung up per team member</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${range === r.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : performance.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <TrendingUp className="h-14 w-14 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No staff on record yet.</p>
            </CardContent>
          </Card>
        ) : (
          performance.map((s: any, i: number) => (
            <Card key={s.id} className={i === 0 && s.revenue > 0 ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${i === 0 && s.revenue > 0 ? "bg-primary/15" : "bg-muted"}`}>
                      {i === 0 && s.revenue > 0 ? <Trophy className="h-4 w-4 text-primary" /> : <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{s.role.replace("_", " ")}</Badge>
                        {s.status === "SUSPENDED" && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{currency} {s.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.salesCount} sale{s.salesCount !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                {topRevenue > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.max(2, (s.revenue / topRevenue) * 100)}%` }} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" /> Avg {currency} {s.avgSaleValue.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserPlus className="h-3.5 w-3.5" /> {s.customersAdded} customers
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <RotateCcw className="h-3.5 w-3.5" /> {s.refundsIssued} refunds
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {s.lastActiveAt ? `Last active ${new Date(s.lastActiveAt).toLocaleDateString()}` : "Never clocked in"}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}