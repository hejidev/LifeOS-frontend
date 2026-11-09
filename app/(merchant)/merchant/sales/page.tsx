"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectForm } from "@/components/merchant/collect-form";
import { Empty, PageHeader, Pill, money, paymentLabel, when } from "@/components/merchant/ops-ui";
import { useBizProfile } from "@/lib/hooks/use-life-data";
import { useSaleActions, useSalePayments, useSales } from "@/lib/hooks/use-merchant-ops";
import type { Range, Sale } from "@/lib/hooks/use-merchant-ops";

type View = "all" | "review" | "unpaid";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function statusPill(sale: Sale) {
  if (sale.status === "PENDING") return <Pill tone="warning">Unpaid</Pill>;
  if (sale.status === "REFUNDED") return <Pill tone="danger">Refunded</Pill>;
  if (sale.status === "CANCELLED") return <Pill>Cancelled</Pill>;
  return null;
}

function SaleDetails({ sale, currency, onClose }: { sale: Sale; currency: string; onClose: () => void }) {
  const payments = useSalePayments(sale.id);
  const { reviewed, status } = useSaleActions();
  const [error, setError] = useState<string | null>(null);

  async function act(task: () => Promise<unknown>, closeAfter = true) {
    setError(null);
    try {
      await task();
      if (closeAfter) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function reverse() {
    const unpaid = sale.status === "PENDING";
    const message = unpaid
      ? "Cancel this sale? The stock goes back on the shelf."
      : "Refund this sale? The stock goes back on the shelf and loyalty points are reversed.";
    if (!window.confirm(message)) return;
    void act(() => status.mutateAsync({ id: sale.id, status: unpaid ? "CANCELLED" : "REFUNDED" }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {statusPill(sale)}
        {sale.soldOffline ? <Pill>Sold offline</Pill> : null}
        {sale.needsReview ? <Pill tone="warning">Needs review</Pill> : null}
        <span>{when(sale.createdAt)}{sale.storeName ? ` · ${sale.storeName}` : ""}</span>
      </div>

      {sale.needsReview && sale.reviewNotes ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-amber-600 dark:text-amber-400">Why this needs a look</p>
          {sale.reviewNotes.split("\n").map((note) => <p key={note}>{note}</p>)}
        </div>
      ) : null}

      <div className="divide-y rounded-lg border">
        {sale.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.quantity} × {money(currency, item.unitPrice)}</p>
            </div>
            <span className="font-medium">{money(currency, item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(currency, sale.subtotal)}</span></div>
        {sale.discount > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{money(currency, sale.discount)}</span></div> : null}
        <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(currency, sale.total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Customer</span>
          {sale.customerId ? <Link className="text-primary hover:underline" href={`/merchant/customers/${sale.customerId}`}>{sale.customerName}</Link> : <span>Walk-in</span>}
        </div>
        {sale.status === "PENDING" ? (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid so far</span><span>{money(currency, sale.amountPaid)}</span></div>
            <div className="flex justify-between font-semibold text-destructive"><span>Still owed</span><span>{money(currency, sale.balance)}</span></div>
          </>
        ) : null}
      </div>

      {payments.data && payments.data.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Payments</p>
          <div className="divide-y rounded-lg border text-sm">
            {payments.data.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p>{payment.kind === "REFUND" ? "Refund" : payment.kind === "COLLECTION" ? "Payment collected" : "Paid at sale"} · {paymentLabel(payment.method)}</p>
                  <p className="text-[11px] text-muted-foreground">{payment.actorName} · {when(payment.createdAt)}</p>
                </div>
                <span className={payment.amount < 0 ? "text-destructive" : "font-medium"}>{money(currency, payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sale.status === "PENDING" ? <CollectForm saleId={sale.id} balance={sale.balance} currency={currency} onDone={onClose} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {sale.needsReview ? (
          <Button variant="outline" size="sm" disabled={reviewed.isPending} onClick={() => act(() => reviewed.mutateAsync(sale.id))}>Mark as reviewed</Button>
        ) : null}
        {sale.status === "PAID" || (sale.status === "PENDING" && sale.amountPaid === 0) ? (
          <Button variant="outline" size="sm" className="text-destructive" disabled={status.isPending} onClick={reverse}>
            {sale.status === "PENDING" ? "Cancel sale" : "Refund sale"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function MerchantSalesPage() {
  const [range, setRange] = useState<Range>("today");
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: profile } = useBizProfile();
  const { data: sales, isLoading } = useSales(range);
  const currency: string = profile?.currency ?? "NGN";

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    if (requested === "review" || requested === "unpaid") {
      setView(requested);
      setRange("month");
    }
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sales ?? [])
      .filter((sale) => (view === "review" ? sale.needsReview : view === "unpaid" ? sale.status === "PENDING" : true))
      .filter((sale) => !q || sale.receiptNumber.toLowerCase().includes(q) || (sale.customerName ?? "").toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sales, view, query]);

  const paid = (sales ?? []).filter((sale) => sale.status === "PAID");
  const revenue = paid.reduce((sum, sale) => sum + sale.total, 0);
  const reviewCount = (sales ?? []).filter((sale) => sale.needsReview).length;
  const selected = (sales ?? []).find((sale) => sale.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader icon={Receipt} title="Sales" subtitle={`${paid.length} paid · ${money(currency, revenue)}`} />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={range} onValueChange={(value) => setRange(value as Range)}>
          <TabsList>{RANGES.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="review">Needs review{reviewCount > 0 ? ` (${reviewCount})` : ""}</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search receipt or customer" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : shown.length === 0 ? (
            <Empty>{view === "review" ? "Nothing needs review." : "No sales match."}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Receipt</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">Payment</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((sale) => (
                    <tr key={sale.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/40" onClick={() => setSelectedId(sale.id)}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{sale.receiptNumber}</span>
                          {sale.needsReview ? <Pill tone="warning">Review</Pill> : null}
                          {sale.soldOffline ? <Pill>Offline</Pill> : null}
                          {statusPill(sale)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">{sale.customerName ?? "Walk-in"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{when(sale.createdAt)}</td>
                      <td className="px-4 py-2.5">{sale.status === "PENDING" ? "Pay later" : paymentLabel(sale.paymentMethod)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {money(currency, sale.total)}
                        {sale.status === "PENDING" ? <span className="block text-[11px] font-normal text-destructive">owes {money(currency, sale.balance)}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.receiptNumber}</DialogTitle></DialogHeader>
          {selected ? <SaleDetails sale={selected} currency={currency} onClose={() => setSelectedId(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}