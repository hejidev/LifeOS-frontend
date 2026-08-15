"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformBillingStats } from "@/lib/hooks/use-life-data";

export default function BillingPage() {
  const { data, isLoading } = usePlatformBillingStats();

  if (isLoading || !data) return <Skeleton className="h-64 rounded-xl" />;
  const d = data as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Revenue</h1>
        <p className="text-muted-foreground mt-1">Live revenue across tool subscriptions and merchant plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total MRR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${d.totalMRR.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tool Subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${d.toolMRR.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Merchant Plans</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${d.merchantMRR.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{d.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{d.premiumUsers} paid, {d.activeMerchants} active merchants</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}