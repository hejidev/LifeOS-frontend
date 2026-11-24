"use client";

import { CheckCircle2, Clock, Download, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money, whatsappNumber } from "@/components/merchant/ops-ui";
import { METHOD_NAMES, receiptText, saveReceipt } from "@/lib/pos/helpers";

export interface ReceiptState {
  sale: any;
  cashReceived?: number;
  warning?: string;
  phone?: string;
}

export function ReceiptDialog({ receipt, businessName, currency, onClose }: { receipt: ReceiptState | null; businessName: string; currency: string; onClose: () => void }) {
  const sale = receipt?.sale;
  const unpaid = sale?.status === "PENDING";
  const text = sale ? receiptText(sale, businessName, currency, receipt?.cashReceived) : "";
  const digits = receipt?.phone ? whatsappNumber(receipt.phone) : "";
  const change = receipt?.cashReceived !== undefined && sale ? Math.max(0, receipt.cashReceived - sale.total) : 0;

  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto border-white/10 bg-[#0F1420] text-white">
        <DialogHeader className="sr-only"><DialogTitle>{unpaid ? "Saved as unpaid" : "Payment received"}</DialogTitle></DialogHeader>
        {receipt && sale ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
              <span className={unpaid ? "flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300" : "flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"}>
                {unpaid ? <Clock className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
              </span>
              <p className="text-sm font-semibold">{unpaid ? "Saved as unpaid" : "Payment received"}</p>
              <p className="font-mono text-3xl font-bold tabular-nums">{money(currency, sale.total)}</p>
              {!unpaid && change > 0 ? <p className="text-sm font-semibold text-amber-300">Change due {money(currency, change)}</p> : null}
              {unpaid ? <p className="text-sm text-amber-300">Balance due {money(currency, sale.balance ?? sale.total)}</p> : null}
            </div>

            <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm">
              <div className="space-y-0.5 text-center">
                <p className="font-semibold">{businessName}</p>
                <p className="font-mono text-[11px] text-white/40">{sale.receiptNumber}</p>
                <p className="text-[11px] text-white/40">{new Date(sale.createdAt).toLocaleString()}</p>
                <p className="text-[11px] text-white/40">{sale.customerName ?? "Walk-in customer"}</p>
              </div>
              <div className="space-y-1.5 border-t border-dashed border-white/10 pt-3">
                {sale.items.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate">{item.name}</p>
                      <p className="text-white/40">{item.quantity} × {money(currency, item.unitPrice)}</p>
                    </div>
                    <span className="shrink-0 font-mono">{money(currency, item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-dashed border-white/10 pt-3 text-xs">
                {sale.discount > 0 ? <div className="flex justify-between text-white/60"><span>Discount</span><span>-{money(currency, sale.discount)}</span></div> : null}
                <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(currency, sale.total)}</span></div>
                {unpaid ? (
                  <div className="flex justify-between text-white/60"><span>Paid so far</span><span>{money(currency, sale.amountPaid ?? 0)}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between text-white/60"><span>Payment</span><span>{METHOD_NAMES[sale.paymentMethod] ?? sale.paymentMethod}</span></div>
                    {receipt.cashReceived !== undefined ? <div className="flex justify-between text-white/60"><span>Cash received</span><span>{money(currency, receipt.cashReceived)}</span></div> : null}
                  </>
                )}
              </div>
            </div>

            {receipt.warning ? <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-200">{receipt.warning}</p> : null}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => saveReceipt(text, sale.receiptNumber)}><Download className="mr-1.5 h-4 w-4" /> Download</Button>
              {digits ? (
                <Button asChild variant="outline" className="col-span-2 border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20">
                  <a href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" /> Send on WhatsApp</a>
                </Button>
              ) : null}
            </div>
            <Button autoFocus className="h-12 w-full bg-emerald-500 text-base font-bold text-[#0B0F1A] hover:bg-emerald-400" onClick={onClose}>New sale</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}