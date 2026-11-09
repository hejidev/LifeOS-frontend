"use client";

import Link from "next/link";
import { MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, PageHeader, Tile, daysAgo, money, whatsappNumber } from "@/components/merchant/ops-ui";
import { useBizProfile } from "@/lib/hooks/use-life-data";
import { useCustomers } from "@/lib/hooks/use-merchant-ops";

export default function ReceivablesPage() {
  const { data: profile } = useBizProfile();
  const { data, isLoading } = useCustomers();
  const currency: string = profile?.currency ?? "NGN";

  const owing = (data ?? []).filter((customer) => (customer.balance ?? 0) > 0).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
  const total = owing.reduce((sum, customer) => sum + (customer.balance ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader icon={Wallet} title="Unpaid" subtitle="Customers who bought on credit" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Tile label="Total owed to you" value={money(currency, total)} tone={total > 0 ? "danger" : undefined} />
        <Tile label="Customers owing" value={String(owing.length)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : owing.length === 0 ? (
            <Empty>Nobody owes you anything.</Empty>
          ) : (
            <div className="divide-y">
              {owing.map((customer) => (
                <div key={customer.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/merchant/customers/${customer.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold hover:text-primary">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone ?? customer.email ?? "No contact on file"} · last purchase {daysAgo(customer.lastOrderAt)}</p>
                  </Link>
                  <span className="font-bold text-destructive">{money(currency, customer.balance)}</span>
                  {customer.phone ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={`https://wa.me/${whatsappNumber(customer.phone)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp</a>
                    </Button>
                  ) : null}
                  <Button asChild size="sm"><Link href={`/merchant/customers/${customer.id}`}>Collect</Link></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}