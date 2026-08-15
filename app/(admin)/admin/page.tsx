"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Store, DollarSign, UserPlus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformOverview, useMyPermissions } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AdminPage() {
  const { data: overview, isLoading } = usePlatformOverview();
  const { data: perms } = useMyPermissions();

  if (isLoading || !overview) return <Skeleton className="h-96 rounded-xl" />;
  const o = overview as any;
  const caps: string[] = (perms as any)?.capabilities ?? [];

  const stats = [
    { label: "Total users", value: o.totalUsers.toLocaleString(), icon: Users },
    { label: "Active merchants", value: o.activeMerchants.toLocaleString(), icon: Store },
    { label: "Pending applications", value: o.pendingApplications, icon: UserPlus, urgent: o.pendingApplications > 0 },
    { label: "Total MRR", value: `$${o.totalMRR.toLocaleString()}`, icon: DollarSign },
  ];

  const quickActions = [
    { cap: "MANAGE_MERCHANTS", label: "Review merchant applications", href: "/admin/merchant-applications" },
    { cap: "MANAGE_CONTENT", label: "Manage content", href: "/admin/content" },
    { cap: "SEND_BROADCASTS", label: "Send a broadcast", href: "/admin/broadcast" },
    { cap: "MESSAGE_USERS", label: "Open messages", href: "/admin/messages" },
  ].filter((a) => caps.includes(a.cap));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Platform management dashboard</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.urgent ? "border-amber-500/40 bg-amber-500/5" : ""}>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      {quickActions.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Your quick actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Button key={a.href} variant="outline" asChild className="justify-between">
                  <Link href={a.href}>{a.label} <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {quickActions.length === 0 && (
        <motion.div variants={item}>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">You currently have no specific permissions assigned. Contact your super admin to be granted access to content, merchant review, broadcasts, or messaging.</p></CardContent></Card>
        </motion.div>
      )}
    </motion.div>
  );
}