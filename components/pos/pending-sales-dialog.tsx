"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { QueuedSale, SaleRecord } from "@/lib/offline/types";

interface PendingSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: QueuedSale[];
  online: boolean;
  syncing: boolean;
  currency: string;
  onSyncNow: () => void;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onView: (sale: SaleRecord) => void;
}

export function PendingSalesDialog({
  open,
  onOpenChange,
  entries,
  online,
  syncing,
  currency,
  onSyncNow,
  onRetry,
  onDiscard,
  onView,
}: PendingSalesDialogProps) {
  const hasPending = entries.some((entry) => entry.status === "pending");

  function confirmDiscard(id: string) {
    const confirmed = window.confirm(
      "Discard this sale? The customer already has the goods. It will be removed from the upload queue and never appear in your sales reports. Tell your manager first."
    );
    if (confirmed) onDiscard(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>Pending sales</DialogTitle>
        </DialogHeader>

        {hasPending ? (
          <Button size="sm" variant="outline" onClick={onSyncNow} disabled={!online || syncing}>
            {syncing ? "Uploading…" : online ? "Sync now" : "Offline"}
          </Button>
        ) : null}

        <div className="flex-1 space-y-2 overflow-y-auto pt-1">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Everything is uploaded.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => onView(entry.sale)}>
                    <p className="truncate text-sm font-semibold">{entry.sale.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.soldAt).toLocaleString()} · {entry.sale.items.length} item
                      {entry.sale.items.length === 1 ? "" : "s"}
                    </p>
                  </button>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="text-sm font-semibold">
                      {currency} {entry.sale.total.toLocaleString()}
                    </p>
                    <Badge variant={entry.status === "failed" ? "destructive" : "warning"} className="text-[10px]">
                      {entry.status === "failed" ? "Needs attention" : "Waiting"}
                    </Badge>
                  </div>
                </div>
                {entry.lastError ? <p className="text-xs text-red-500">{entry.lastError}</p> : null}
                {entry.status === "failed" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => onRetry(entry.id)} disabled={!online}>
                      Retry
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => confirmDiscard(entry.id)}>
                      Discard
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}