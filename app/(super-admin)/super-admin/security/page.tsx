"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorCog,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSecurityOverview,
  useFlaggedAccounts,
  useLoginAttempts,
  useForceLogoutUser,
} from "@/lib/hooks/use-life-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const formatDate = (value?: string | Date) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function SecurityPage() {
  const { data: overview, isLoading, refetch, isFetching } = useSecurityOverview();
  const { data: flagged = [] } = useFlaggedAccounts();
  const { data: attempts = [] } = useLoginAttempts();
  const forceLogout = useForceLogoutUser();

  if (isLoading || !overview) {
    return <Skeleton className="h-[760px] rounded-2xl" />;
  }

  const o = overview as any;
  const suspiciousAccounts = flagged as any[];
  const loginAttempts = attempts as any[];

  const failed15m = Number(o.failedLoginsLast15m || 0);
  const failed24h = Number(o.failedLoginsLast24h || 0);
  const totalAdmins = Number(o.totalAdmins || 0);
  const twoFactorAdmins = Number(o.twoFactorAdmins || 0);
  const twoFactorAdoption = Number(o.twoFactorAdoption || 0);

  const riskLevel =
    suspiciousAccounts.length > 0 || failed15m >= 10
      ? "High attention"
      : failed15m > 0
        ? "Monitor"
        : "Healthy";

  const riskVariant =
    riskLevel === "High attention"
      ? "destructive"
      : riskLevel === "Monitor"
        ? "secondary"
        : "success";

  const handleForceLogout = (userId?: string) => {
    if (!userId || forceLogout.isPending) return;

    const confirmed = window.confirm(
      "End every active session for this account? The user will need to sign in again."
    );

    if (confirmed) {
      forceLogout.mutate(userId);
    }
  };

  const metrics = [
    {
      label: "Threat level",
      value: riskLevel,
      description:
        suspiciousAccounts.length > 0
          ? `${suspiciousAccounts.length} account(s) require investigation`
          : "No flagged accounts at this time",
      icon: ShieldAlert,
      tone:
        riskLevel === "High attention"
          ? "bg-destructive/10 text-destructive"
          : riskLevel === "Monitor"
            ? "bg-amber-500/10 text-amber-600"
            : "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Failed sign-ins",
      value: failed15m.toLocaleString(),
      description: `${failed24h.toLocaleString()} failed attempts in the last 24 hours`,
      icon: Fingerprint,
      tone: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Admin MFA coverage",
      value: `${twoFactorAdoption}%`,
      description: `${twoFactorAdmins}/${totalAdmins} admin accounts protected`,
      icon: LockKeyhole,
      tone:
        twoFactorAdoption === 100
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Protected accounts",
      value: Number(o.totalUsers || 0).toLocaleString(),
      description: "Users, merchants, admins, and super-admins",
      icon: Users,
      tone: "bg-blue-500/10 text-blue-600",
    },
  ];

  const controlLinks = [
    {
      label: "User access",
      description: "Review user accounts and access status",
      href: "/super-admin/users",
      icon: Users,
    },
    {
      label: "Merchant control",
      description: "Applications, verification, and merchant access",
      href: "/super-admin/merchant-applications",
      icon: Building2,
    },
    {
      label: "Admin permissions",
      description: "Manage administrator roles and authority",
      href: "/super-admin/admins",
      icon: ShieldCheck,
    },
    {
      label: "Audit trail",
      description: "Investigate sensitive administrative actions",
      href: "/super-admin/audit-log",
      icon: Activity,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-destructive/10 via-background to-violet-500/10 p-6 md:p-8"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-destructive/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant={riskVariant as any} className="mb-3 gap-1.5">
              <ShieldAlert className="h-3 w-3" />
              {riskLevel}
            </Badge>

            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight md:text-4xl">
              Security Command Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Monitor authentication activity, investigate suspicious access, and
              protect every LifeOS role from a single control plane.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh intelligence
            </Button>

            <Button asChild>
              <Link href="/super-admin/audit-log">
                Investigate audit trail
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={item}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {metric.value}
                    </p>
                  </div>
                  <span className={`rounded-xl p-2.5 ${metric.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </motion.section>

      <motion.section
        variants={item}
        className="grid grid-cols-1 gap-6 xl:grid-cols-5"
      >
        <Card className="border-destructive/30 xl:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Incident queue
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Accounts with repeated failed authentication attempts.
              </p>
            </div>

            <Badge variant={suspiciousAccounts.length ? "destructive" : "success"}>
              {suspiciousAccounts.length
                ? `${suspiciousAccounts.length} open`
                : "Clear"}
            </Badge>
          </CardHeader>

          <CardContent>
            {suspiciousAccounts.length === 0 ? (
              <div className="py-10 text-center">
                <BadgeCheck className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-3 text-sm font-medium">No active security incidents</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No accounts have crossed your suspicious-login threshold.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suspiciousAccounts.map((account) => (
                  <div
                    key={account.email}
                    className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ShieldX className="h-4 w-4 shrink-0 text-destructive" />
                          <p className="truncate text-sm font-semibold">
                            {account.email}
                          </p>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {account.failedAttempts} failed sign-in attempt
                          {account.failedAttempts === 1 ? "" : "s"} within 15 minutes
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/super-admin/users?email=${encodeURIComponent(
                              account.email
                            )}`}
                          >
                            Inspect
                          </Link>
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!account.userId || forceLogout.isPending}
                          onClick={() => handleForceLogout(account.userId)}
                        >
                          <LogOut className="mr-1.5 h-3.5 w-3.5" />
                          End sessions
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorCog className="h-4 w-4 text-primary" />
              Access control center
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Navigate to role-specific operational controls.
            </p>
          </CardHeader>

          <CardContent className="space-y-2">
            {controlLinks.map((control) => {
              const Icon = control.icon;

              return (
                <Link
                  key={control.href}
                  href={control.href}
                  className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60"
                >
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{control.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {control.description}
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        variants={item}
        className="grid grid-cols-1 gap-6 xl:grid-cols-5"
      >
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-primary" />
                Authentication feed
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Recent sign-in activity across all roles.
              </p>
            </div>

            <Badge variant="outline">{loginAttempts.length} events</Badge>
          </CardHeader>

          <CardContent>
            {loginAttempts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No login attempts recorded yet.
              </p>
            ) : (
              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {loginAttempts.slice(0, 30).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{attempt.email}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(attempt.createdAt)}
                      </p>
                    </div>

                    <Badge variant={attempt.success ? "success" : "destructive"}>
                      {attempt.success ? "Successful" : "Blocked / failed"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Merchant conversion watch
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Recent user-to-merchant account conversions.
            </p>
          </CardHeader>

          <CardContent>
            {!o.recentMerchantConversions?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No merchant conversions yet.
              </p>
            ) : (
              <div className="space-y-2">
                {o.recentMerchantConversions.slice(0, 6).map((merchant: any) => (
                  <div
                    key={merchant.id}
                    className="rounded-xl border bg-muted/20 px-3 py-3"
                  >
                    <p className="truncate text-sm font-medium">
                      {merchant.businessName}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {merchant.userName} · {merchant.userEmail}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Converted {formatDate(merchant.convertedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}