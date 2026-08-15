"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, Store, DollarSign, UserPlus, ArrowRight, ScrollText, Crown, ShieldCheck,
  TrendingUp, BarChart3, Wallet, ShieldAlert, Radio, UserCog, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  usePlatformOverview, usePlatformAuditLog, usePlatformAnalytics,
  usePlatformBillingStats, useSecurityOverview, useFlaggedAccounts,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const QUICK_ACTIONS = [
  { label: "Merchant Applications", href: "/super-admin/merchant-applications", icon: Store },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Admins", href: "/super-admin/admins", icon: UserCog },
  { label: "Broadcast", href: "/super-admin/broadcast", icon: Radio },
  { label: "Security", href: "/super-admin/security", icon: ShieldAlert },
  { label: "Audit Log", href: "/super-admin/audit-log", icon: ScrollText },
];

function KpiCard({ icon: Icon, label, value, sub, urgent }: any) {
  return (
    <Card className={urgent ? "border-amber-500/40 bg-amber-500/5" : "hover:border-primary/20 transition-colors"}>
      <CardContent className="pt-5 pb-4">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminOverviewPage() {
  const { data: overview, isLoading } = usePlatformOverview();
  const { data: auditLog = [], isLoading: auditLoading } = usePlatformAuditLog();
  const { data: analytics, isLoading: analyticsLoading } = usePlatformAnalytics();
  const { data: billing, isLoading: billingLoading } = usePlatformBillingStats();
  const { data: security, isLoading: securityLoading } = useSecurityOverview();
  const { data: flagged = [] } = useFlaggedAccounts();

  if (isLoading || !overview) return <Skeleton className="h-96 rounded-xl" />;
  const o = overview as any;
  const b = billing as any;
  const s = security as any;
  const an = analytics as any;

  const kpis = [
    { label: "Total users", value: o.totalUsers.toLocaleString(), icon: Users, sub: `+${o.todaySignups} today` },
    { label: "Active merchants", value: o.activeMerchants.toLocaleString(), icon: Store },
    { label: "Pending applications", value: o.pendingApplications, icon: UserPlus, urgent: o.pendingApplications > 0 },
    { label: "Total MRR", value: `$${o.totalMRR.toLocaleString()}`, icon: DollarSign },
    { label: "Premium users", value: billingLoading ? "-" : (b?.premiumUsers ?? 0).toLocaleString(), icon: Crown },
    { label: "2FA adoption", value: securityLoading ? "-" : `${s?.twoFactorAdoption ?? 0}%`, icon: ShieldCheck, sub: securityLoading ? undefined : `${s?.twoFactorAdmins ?? 0}/${s?.totalAdmins ?? 0} admins` },
  ];

  const revenueTotal = b ? b.toolMRR + b.merchantMRR : 0;
  const toolPct = revenueTotal > 0 ? Math.round((b.toolMRR / revenueTotal) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Command Center
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">Platform-wide overview and controls.</p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((qa) => (
          <Button key={qa.href} variant="outline" size="sm" asChild className="rounded-full">
            <Link href={qa.href}><qa.icon className="mr-1.5 h-3.5 w-3.5" /> {qa.label}</Link>
          </Button>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </motion.div>

      {o.pendingApplications > 0 && (
        <motion.div variants={item}>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm">{o.pendingApplications} merchant application{o.pendingApplications === 1 ? "" : "s"} waiting for review.</p>
              <Button size="sm" asChild><Link href="/super-admin/merchant-applications">Review now <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Signup growth</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !an ? <Skeleton className="h-56 rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={an.signups}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#signupGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Module usage</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !an ? <Skeleton className="h-56 rounded-lg" /> : (
              <div className="space-y-3">
                {an.moduleUsage.map((m: any) => (
                  <div key={m.module}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{m.module}</span>
                      <span className="text-muted-foreground">{m.usage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full gradient-bg" style={{ width: `${m.usage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Revenue mix</CardTitle>
          </CardHeader>
          <CardContent>
            {billingLoading || !b ? <Skeleton className="h-32 rounded-lg" /> : (
              <div className="space-y-4">
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: `${toolPct}%` }} />
                  <div className="h-full bg-violet-500" style={{ width: `${100 - toolPct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Tool plans</p>
                    <p className="text-lg font-bold mt-0.5">${b.toolMRR.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-violet-500" /> Merchant plans</p>
                    <p className="text-lg font-bold mt-0.5">${b.merchantMRR.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Security snapshot</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/super-admin/security">Full report</Link></Button>
          </CardHeader>
          <CardContent>
            {securityLoading || !s ? <Skeleton className="h-32 rounded-lg" /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
                    <p className="text-lg font-bold">{s.failedLoginsLast15m}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Failed logins (15m)</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
                    <p className="text-lg font-bold">{s.failedLoginsLast24h}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Failed logins (24h)</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
                    <p className="text-lg font-bold">{flagged.length}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Flagged accounts</p>
                  </div>
                </div>
                {flagged.length > 0 ? (
                  <div className="space-y-1.5">
                    {(flagged as any[]).slice(0, 3).map((f) => (
                      <div key={f.email} className="flex items-center justify-between text-xs rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                        <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-destructive" /> {f.email}</span>
                        <Badge variant="destructive" className="text-[10px]">{f.failedAttempts} attempts</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No suspicious login activity right now.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> Recent admin activity</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/super-admin/audit-log">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {auditLoading ? <Skeleton className="h-48 rounded-lg" /> : auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No admin actions logged yet.</p>
            ) : (
              <div className="space-y-2">
                {(auditLog as any[]).slice(0, 6).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate">{l.description}</p>
                      <p className="text-xs text-muted-foreground">{l.adminName}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant="outline" className="text-[10px]">{l.action.replace(/_/g, " ")}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(l.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Recent merchant conversions</CardTitle>
          </CardHeader>
          <CardContent>
            {securityLoading || !s ? <Skeleton className="h-48 rounded-lg" /> : s.recentMerchantConversions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No merchant conversions yet.</p>
            ) : (
              <div className="space-y-2">
                {s.recentMerchantConversions.slice(0, 6).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate">{m.businessName}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.userName} · {m.userEmail}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-3">{m.convertedAt ? new Date(m.convertedAt).toLocaleDateString() : "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}