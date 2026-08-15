"use client";

import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformAuditLog } from "@/lib/hooks/use-life-data";

export default function AuditLogPage() {
  const { data: logs = [], isLoading } = usePlatformAuditLog();

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" /> Audit Log</h1>
        <p className="text-muted-foreground mt-1">Every administrative action, in order.</p>
      </div>

      <div className="space-y-2">
        {(logs as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No admin actions logged yet.</p>
        ) : (
          (logs as any[]).map((l) => (
            <Card key={l.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{l.description}</p>
                  <p className="text-xs text-muted-foreground">{l.adminName} · {l.adminEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[10px]">{l.action.replace(/_/g, " ")}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(l.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}