"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectForm } from "@/components/merchant/collect-form";
import { Empty, Pill, Tile, daysAgo, money, when, whatsappNumber } from "@/components/merchant/ops-ui";
import { useCustomerProfile } from "@/lib/hooks/use-merchant-ops";

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCustomerProfile(id);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <Empty>We couldn't load this customer.</Empty>;

  const { customer, stats, currency } = data;
  const m = (value: unknown) => money(currency, value);
  const first = customer.name.trim().split(/\s+/)[0];
  const reminder = encodeURIComponent(
    [`Hello ${first}, a friendly reminder that you have an unpaid balance of ${m(stats.balance)}:`, ...data.pending.slice(0, 5).map((sale) => `- ${sale.receiptNumber}: ${m(sale.balance)}`), "Thank you!"].join("\n")
  );

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/merchant/customers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Customers</Link></Button>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{customer.name}</h1>
              {stats.balance > 0 ? <Pill tone="danger">Owes money</Pill> : null}
              {stats.orders === 0 ? <Pill>New customer</Pill> : null}
            </div>
            <p className="text-sm text-muted-foreground">{customer.phone ?? customer.email ?? "No contact on file"} · customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {customer.phone ? <Button asChild variant="outline" size="sm"><a href={`tel:${customer.phone}`}><Phone className="mr-1.5 h-4 w-4" /> Call</a></Button> : null}
            {customer.phone ? <Button asChild variant="outline" size="sm"><a href={`https://wa.me/${whatsappNumber(customer.phone)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp</a></Button> : null}
            {customer.email ? <Button asChild variant="outline" size="sm"><a href={`mailto:${customer.email}`}><Mail className="mr-1.5 h-4 w-4" /> Email</a></Button> : null}
            <Button asChild size="sm"><Link href="/merchant/pos"><ShoppingCart className="mr-1.5 h-4 w-4" /> New sale</Link></Button>
          </div>
        </CardContent>
      </Card>

      {stats.balance > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Outstanding balance</p>
              <p className="text-3xl font-bold">{m(stats.balance)}</p>
              <p className="text-xs text-muted-foreground">{stats.pendingCount} unpaid sale{stats.pendingCount === 1 ? "" : "s"} · oldest {daysAgo(data.pending[0]?.createdAt)}</p>
            </div>
            {customer.phone ? (
              <Button asChild variant="outline"><a href={`https://wa.me/${whatsappNumber(customer.phone)}?text=${reminder}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" /> Send reminder</a></Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Lifetime spend" value={m(stats.lifetimeSpend)} />
        <Tile label="Orders" value={String(stats.orders)} hint={`Average ${m(stats.averageOrder)}`} />
        <Tile label="Loyalty points" value={String(customer.loyaltyPoints)} />
        <Tile label="Last purchase" value={stats.lastPurchaseAt ? daysAgo(stats.lastPurchaseAt) : "None yet"} />
      </div>

      {data.pending.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Unpaid sales</p>
            {data.pending.map((sale) => (
              <div key={sale.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{sale.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">{sale.summary} · {when(sale.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{m(sale.balance)}</p>
                    {sale.amountPaid > 0 ? <p className="text-[11px] text-muted-foreground">paid {m(sale.amountPaid)} of {m(sale.total)}</p> : null}
                  </div>
                  <Button size="sm" variant={collectingId === sale.id ? "secondary" : "default"} onClick={() => setCollectingId(collectingId === sale.id ? null : sale.id)}>
                    {collectingId === sale.id ? "Close" : "Collect"}
                  </Button>
                </div>
                {collectingId === sale.id ? <CollectForm saleId={sale.id} balance={sale.balance} currency={currency} onDone={() => setCollectingId(null)} /> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-1 p-4">
            <p className="mb-2 text-sm font-semibold">Recent purchases</p>
            {data.recent.length === 0 ? <Empty>No purchases yet.</Empty> : data.recent.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sale.receiptNumber}</span>
                    {sale.status === "PENDING" ? <Pill tone="warning">Unpaid</Pill> : sale.status !== "PAID" ? <Pill>{sale.status.toLowerCase()}</Pill> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{sale.summary} · {when(sale.createdAt)}</p>
                </div>
                <span className="font-semibold">{m(sale.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Favourite products</p>
            {data.favourites.length === 0 ? <Empty>Nothing yet.</Empty> : data.favourites.map((item, index) => (
              <div key={`${item.name}-${index}`} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm"><span className="truncate">{item.name}</span><span className="text-xs text-muted-foreground">{item.units} bought</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(6, (item.units / data.favourites[0].units) * 100)}%` }} /></div>
              </div>
            ))}
            {customer.notes ? <p className="border-t pt-3 text-sm text-muted-foreground">{customer.notes}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}