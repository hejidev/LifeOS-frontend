"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Store, Clock, XCircle, ShieldOff, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchantStatus } from "@/lib/hooks/use-life-data";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { MerchantPlanPicker } from "@/components/merchant/merchant-plan-picker";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: status, isLoading, isError } = useMerchantStatus();
  useQuery({ queryKey: ["merchantStatus"], queryFn: () => api.get("/merchant/status").then((d) => d.status), throwOnError: false });

  if (pathname === "/merchant/apply") return <>{children}</>;

  if (isError) {
    return (
      <GateScreen icon={<XCircle className="h-10 w-10 text-destructive" />} title="Couldn't load merchant status">
        <p className="text-sm text-muted-foreground">Please refresh or try again in a moment.</p>
      </GateScreen>
    );
  }

  if (isLoading || !status) return <div className="p-6"><Skeleton className="h-[calc(100vh-4rem)] rounded-xl" /></div>;

  const s = status as any;
  

  if (s.status === "PENDING") {
    return (
      <GateScreen icon={<Clock className="h-10 w-10 text-amber-500" />} title="Application under review">
        <p className="text-sm text-muted-foreground">
          We're reviewing your application for <span className="text-foreground font-medium">{s.businessName}</span>. This usually takes 1–2 business days.
        </p>
        <p className="text-xs text-muted-foreground">Applied {new Date(s.appliedAt).toLocaleDateString()}</p>
      </GateScreen>
    );
  }

  if (s.status === "REJECTED") {
    return (
      <GateScreen icon={<XCircle className="h-10 w-10 text-destructive" />} title="Application not approved">
        {s.rejectionReason && <p className="text-sm text-muted-foreground">{s.rejectionReason}</p>}
        <Button asChild><Link href="/merchant/apply">Re-apply <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
      </GateScreen>
    );
  }

  if (s.status === "SUSPENDED") {
    return (
      <GateScreen icon={<ShieldOff className="h-10 w-10 text-destructive" />} title="Merchant account suspended">
        {s.rejectionReason && <p className="text-sm text-muted-foreground">{s.rejectionReason}</p>}
        <p className="text-xs text-muted-foreground">Contact support if you believe this is a mistake.</p>
      </GateScreen>
    );
  }

  if (s.status === "APPROVED" && s.planStatus !== "ACTIVE") {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="text-center space-y-2">
          <Store className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-xl font-semibold">You're approved! Choose a plan to activate your dashboard.</h2>
        </div>
        <MerchantPlanPicker />
      </div>
    );
  }
  
  if (s.status === "APPROVED" && s.planStatus === "ACTIVE") return <MerchantShell>{children}</MerchantShell>;

  return (
    <GateScreen icon={<Store className="h-10 w-10 text-primary" />} title="Become a merchant">
      <p className="text-sm text-muted-foreground">The merchant portal — POS, inventory, staff, and sales — is only available to approved merchants.</p>
      <Button asChild><Link href="/merchant/apply">Apply as a merchant <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
    </GateScreen>
  );
}

function GateScreen({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-3">
          <div className="mx-auto w-fit">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}