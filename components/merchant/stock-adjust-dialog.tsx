"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Empty, when } from "@/components/merchant/ops-ui";
import { useAdjustStock, useStockHistory } from "@/lib/hooks/use-merchant-ops";
import type { StockReason } from "@/lib/hooks/use-merchant-ops";
import { cn } from "@/lib/utils";

type Mode = "add" | "remove" | "set";

const REASON_LABELS: Record<string, string> = {
  RECEIVED: "Stock received",
  DAMAGED: "Damaged",
  EXPIRED: "Expired",
  COUNT_CORRECTION: "Stock count",
  RETURNED_TO_SUPPLIER: "Returned to supplier",
  OTHER: "Other",
  MANUAL_EDIT: "Edited by hand",
};

const MODES: { key: Mode; label: string }[] = [
  { key: "add", label: "Add stock" },
  { key: "remove", label: "Remove stock" },
  { key: "set", label: "Set count" },
];

const ADD_REASONS: StockReason[] = ["RECEIVED", "OTHER"];
const REMOVE_REASONS: StockReason[] = ["DAMAGED", "EXPIRED", "RETURNED_TO_SUPPLIER", "OTHER"];

function Pills<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface StockAdjustDialogProps {
  product: { id: string; name: string; stock: number } | null;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustDialog({ product, onOpenChange }: StockAdjustDialogProps) {
  const adjust = useAdjustStock();
  const [mode, setMode] = useState<Mode>("add");
  const [reason, setReason] = useState<StockReason>("RECEIVED");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode("add");
    setReason("RECEIVED");
    setQuantity("");
    setNote("");
    setError(null);
  }, [product?.id]);

  const current = product?.stock ?? 0;
  const amount = parseInt(quantity, 10) || 0;
  const target = mode === "add" ? current + amount : mode === "remove" ? current - amount : amount;
  const delta = target - current;
  const reasons = mode === "add" ? ADD_REASONS : REMOVE_REASONS;

  function changeMode(next: Mode) {
    setMode(next);
    setReason(next === "add" ? "RECEIVED" : next === "remove" ? "DAMAGED" : "COUNT_CORRECTION");
  }

  async function submit() {
    if (!product) return;
    if (quantity.trim() === "" || (mode !== "set" && amount < 1)) return setError("Enter how many units.");
    if (mode === "remove" && amount > current) return setError(`Only ${current} in stock.`);
    if (delta === 0) return setError("That matches the current stock.");
    setError(null);
    try {
      await adjust.mutateAsync({
        productId: product.id,
        delta,
        reason: mode === "set" ? "COUNT_CORRECTION" : reason,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't adjust stock.");
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">Adjust {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Now in stock: <span className="font-semibold text-foreground">{current}</span>
          </p>
          <Pills items={MODES} value={mode} onChange={changeMode} />
          {mode !== "set" ? (
            <Pills items={reasons.map((key) => ({ key, label: REASON_LABELS[key] }))} value={reason} onChange={setReason} />
          ) : null}

          <div className="space-y-1">
            <Label className="text-xs">{mode === "set" ? "Counted quantity" : "Quantity"}</Label>
            <Input inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
          </div>

          {quantity.trim() !== "" ? (
            <p className={cn("text-sm font-medium", target < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
              {target < 0 ? "That's more than you have." : `Stock goes from ${current} to ${target}${delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}.`}
            </p>
          ) : null}

          <div className="space-y-1">
            <Label className="text-xs">Note (optional)</Label>
            <Input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={adjust.isPending} onClick={submit}>
            {adjust.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StockHistoryList({ productId }: { productId: string }) {
  const { data, isLoading, error } = useStockHistory(productId);

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-xs text-destructive">Couldn't load the history.</p>;
  if (!data || data.length === 0) return <Empty>No adjustments yet. Sales aren't listed here.</Empty>;

  return (
    <div className="max-h-56 divide-y overflow-y-auto rounded-lg border">
      {data.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{REASON_LABELS[row.reason] ?? row.reason}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.actorName} · {when(row.createdAt)}
            </p>
            {row.note ? <p className="text-[11px] text-muted-foreground">{row.note}</p> : null}
          </div>
          <div className="text-right">
            <p className={cn("font-bold", row.delta < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
              {row.delta > 0 ? `+${row.delta}` : row.delta}
            </p>
            <p className="text-[11px] text-muted-foreground">now {row.stockAfter}</p>
          </div>
        </div>
      ))}
    </div>
  );
}