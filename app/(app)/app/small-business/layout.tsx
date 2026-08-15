"use client";

import Link from "next/link";
import { Store, Clock, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchantStatus } from "@/lib/hooks/use-life-data";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export default function SmallBusinessLayout({ children }: { children: React.ReactNode }) {
  const { data: status, isLoading } = useMerchantStatus();
  useQuery({ queryKey: ["merchantStatus"], queryFn: () => api.get("/merchant/status").then((d) => d.status), throwOnError: false });

  if (isLoading || !status) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const s = status as any;

  if (s.status === "APPROVED") return <>{children}</>;

  if (s.status === "PENDING") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <Clock className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-semibold">Application under review</h2>
            <p className="text-sm text-muted-foreground">
              We're reviewing your merchant application for <span className="text-foreground font-medium">{s.businessName}</span>. This usually takes 1–2 business days.
            </p>
            <p className="text-xs text-muted-foreground">Applied {new Date(s.appliedAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (s.status === "REJECTED") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Application not approved</h2>
            {s.rejectionReason && <p className="text-sm text-muted-foreground">{s.rejectionReason}</p>}
            <Button asChild><Link href="/app/merchant/apply">Re-apply <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // NONE — never applied
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-3">
          <Store className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Become a merchant</h2>
          <p className="text-sm text-muted-foreground">
            The business dashboard — POS, inventory, customers, and sales — is only available to approved merchants.
          </p>
          <Button asChild><Link href="/app/merchant/apply">Apply as a merchant <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}