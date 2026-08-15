"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMerchantStaff, useStaffActivityLog } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function StaffActivityPage() {
  const { data: staff = [] } = useMerchantStaff();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: activity = [] } = useStaffActivityLog(filter);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 px-1">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> Staff Activity
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Monitor what your team is doing in the store.</p>
        </div>
        <select
          className="h-9 w-full sm:w-auto rounded-lg border border-input bg-background px-3 text-sm"
          value={filter ?? ""}
          onChange={(e) => setFilter(e.target.value || undefined)}
        >
          <option value="">All staff</option>
          {(staff as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </motion.div>

      <motion.div variants={item} className="space-y-2">
        {(activity as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
        ) : (
          (activity as any[]).map((a) => (
            <Card key={a.id}>
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground">{a.staff.name} · {a.staff.role}</p>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0">
                  <Badge variant="outline" className="text-[10px]">{a.action.replace("_", " ")}</Badge>
                  <p className="text-[10px] text-muted-foreground sm:mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}