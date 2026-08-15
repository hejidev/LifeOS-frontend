"use client";

import Link from "next/link";
import { Store, ArrowRight, Clock, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMerchantStatus } from "@/lib/hooks/use-life-data";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";


export function BecomeMerchantCard() {
  const { data: status } = useMerchantStatus();
  useQuery({ queryKey: ["merchantStatus"], queryFn: () => api.get("/merchant/status").then((d) => d.status), throwOnError: false });
  const s = status as any;
  if (!s) return null;

  if (s.status === "NONE") {
    return (
      <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Store className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold">Run a business? Become a merchant.</p>
              <p className="text-xs text-muted-foreground">Get your own POS, inventory, and staff dashboard.</p>
            </div>
          </div>
          <Button size="sm" asChild><Link href="/merchant/apply">Apply now <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (s.status === "PENDING") {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm">Your merchant application for <span className="font-medium">{s.businessName}</span> is under review.</p>
        </CardContent>
      </Card>
    );
  }

  if (s.status === "APPROVED" && s.planStatus !== "ACTIVE") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">You're approved! Choose a plan to activate your merchant dashboard.</p>
          </div>
          <Button size="sm" asChild><Link href="/merchant/billing">Choose a plan</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (s.status === "APPROVED" && s.planStatus === "ACTIVE") {
    return (
      <Card className="hover:border-primary/20 transition-colors">
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3"><Store className="h-5 w-5 text-primary shrink-0" /><p className="text-sm">Your merchant dashboard is live.</p></div>
          <Button size="sm" variant="outline" asChild><Link href="/merchant/dashboard">Open merchant portal <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}