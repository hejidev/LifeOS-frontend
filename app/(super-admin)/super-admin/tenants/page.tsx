"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformTenants } from "@/lib/hooks/use-life-data";

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = usePlatformTenants();

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground mt-1">{tenants.length} businesses</p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium">Business</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Team size</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(tenants as any[]).map((tenant) => (
              <tr key={tenant.id} className="border-b border-border hover:bg-accent/30">
                <td className="p-3 font-medium">{tenant.name}</td>
                <td className="p-3"><Badge variant={tenant.plan === "free" ? "outline" : "default"}>{tenant.plan}</Badge></td>
                <td className="p-3">{tenant.users}</td>
                <td className="p-3">
                  <Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "warning" : "destructive"}>
                    {tenant.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}