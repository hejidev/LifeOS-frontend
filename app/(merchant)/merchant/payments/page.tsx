"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, PageHeader, Pill, Tile, money, paymentLabel, when } from "@/components/merchant/ops-ui";
import { useBizProfile } from "@/lib/hooks/use-life-data";
import { useConfirmPayments, useDisputePayment, usePaymentSummary, usePendingPayments } from "@/lib/hooks/use-payment-confirmation";
import type { PendingPayment } from "@/lib/hooks/use-payment-confirmation";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "TRANSFER", label: "Transfer" },
  { key: "CARD", label: "Card" },
  { key: "MOBILE_MONEY", label: "Mobile money" },
];

export default function PaymentsPage() {
  const { data: profile } = useBizProfile();
  const pending = usePendingPayments();
  const summary = usePaymentSummary();
  const confirm = useConfirmPayments();
  const dispute = useDisputePayment();
  const currency: string = profile?.currency ?? "NGN";

  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<PendingPayment | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => (pending.data ?? []).filter((row) => filter === "all" || row.paymentMethod === filter), [pending.data, filter]);
  const chosen = rows.filter((row) => selected.has(row.id));
  const chosenTotal = chosen.reduce((sum, row) => sum + row.total, 0);
  const allSelected = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmIds(ids: string[]) {
    setError(null);
    try {
      await confirm.mutateAsync(ids);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't confirm.");
    }
  }

  async function submitDispute(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setError(null);
    try {
      await dispute.mutateAsync({ id: target.id, reason: reason.trim() });
      setTarget(null);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't flag this payment.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader icon={ShieldCheck} title="Payments to confirm" subtitle="Match staff-recorded transfers, card and mobile payments against your bank alerts" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Awaiting confirmation" value={summary.data ? money(currency, summary.data.awaitingTotal) : "..."} hint={summary.data ? `${summary.data.awaitingCount} payment${summary.data.awaitingCount === 1 ? "" : "s"}` : undefined} />
        <Tile label="Disputed" value={summary.data ? money(currency, summary.data.disputedTotal) : "..."} tone={summary.data && summary.data.disputedCount > 0 ? "danger" : undefined} hint={summary.data ? `${summary.data.disputedCount} flagged` : undefined} />
        <Tile label="Selected" value={money(currency, chosenTotal)} hint={`${chosen.length} selected`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", filter === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}>
            {allSelected ? "Clear selection" : "Select all"}
          </Button>
          <Button size="sm" disabled={chosen.length === 0 || confirm.isPending} onClick={() => confirmIds(chosen.map((row) => row.id))}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm {chosen.length > 0 ? `(${chosen.length})` : ""}
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="p-0">
          {pending.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <Empty>Nothing waiting. Every non-cash payment is confirmed.</Empty>
          ) : (
            <div className="divide-y">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${row.receiptNumber}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4" />
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold">{row.receiptNumber}</span>
                      {row.confirmation === "DISPUTED" ? <Pill tone="danger">Disputed</Pill> : <Pill tone="warning">Awaiting</Pill>}
                      {row.soldOffline ? <Pill>Offline</Pill> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paymentLabel(row.paymentMethod)} · rung by {row.staffName}{row.storeName ? ` · ${row.storeName}` : ""} · {when(row.createdAt)}
                    </p>
                    <p className={cn("text-xs", row.paymentReference ? "text-foreground" : "font-medium text-amber-600")}>
                      {row.paymentReference ? `Reference: ${row.paymentReference}` : "No reference was entered"}
                    </p>
                  </div>
                  <span className="text-base font-bold tabular-nums">{money(currency, row.total)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={confirm.isPending} onClick={() => confirmIds([row.id])}>Confirm</Button>
                    {row.confirmation === "AWAITING" ? (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setTarget(row); setReason(""); setError(null); }}>
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Didn't arrive
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline"><Link href="/merchant/sales?view=review">Refund in Sales</Link></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Confirming means you saw the money arrive. If it didn't, choose "Didn't arrive". The sale is flagged for review, and you can refund it from Sales to put the stock back.
      </p>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Payment didn't arrive</DialogTitle></DialogHeader>
          <form onSubmit={submitDispute} className="space-y-3">
            <p className="text-sm text-muted-foreground">{target?.receiptNumber} · {target ? money(currency, target.total) : ""} by {target ? paymentLabel(target.paymentMethod) : ""}</p>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What did you find? (e.g. no matching credit)" maxLength={200} autoFocus required />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={dispute.isPending || reason.trim().length < 3}>Flag payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}