"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeftRight, Banknote, ChevronRight, Clock, CreditCard, Loader2, Minus, Pause, Pencil, Plus, ShoppingCart, Smartphone, Trash2, Users, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/components/merchant/ops-ui";
import type { Customer, Draft, Line, Method } from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";

export const METHOD_OPTIONS: { value: Method; label: string; icon: LucideIcon }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
  { value: "MOBILE_MONEY", label: "Mobile", icon: Smartphone },
  { value: "LATER", label: "Pay later", icon: Clock },
];

const DEPOSIT_OPTIONS = METHOD_OPTIONS.filter((item) => item.value !== "LATER");
const field = "border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 focus-visible:ring-emerald-400/40";

export interface Totals {
  subtotal: number;
  manual: number;
  redeem: number;
  redeemValue: number;
  maxRedeem: number;
  total: number;
  itemCount: number;
}

interface Props {
  currency: string;
  lines: Line[];
  draft: Draft;
  customer: Customer | null;
  totals: Totals;
  method: Method;
  cashReceived: string;
  deposit: string;
  depositMethod: string;
  loyaltyOn: boolean;
  hint: string | null;
  error: string | null;
  submitting: boolean;
  canCharge: boolean;
  onMethod: (method: Method) => void;
  onCash: (value: string) => void;
  onDeposit: (value: string) => void;
  onDepositMethod: (method: string) => void;
  onRedeem: (points: number) => void;
  onQty: (id: string, quantity: number) => void;
  onPrice: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  onDraft: (patch: Partial<Draft>) => void;
  onCustomer: () => void;
  onClear: () => void;
  onHold: () => void;
  onCharge: () => void;
  onClose?: () => void;
}

function QtyField({ value, onCommit }: { value: number; onCommit: (quantity: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  function commit() {
    const parsed = parseInt(text, 10);
    if (!parsed) setText(String(value));
    else onCommit(parsed);
  }

  return (
    <input
      inputMode="numeric"
      aria-label="Quantity"
      value={text}
      onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 5))}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      className="h-8 w-10 rounded-md bg-transparent text-center font-mono text-sm outline-none focus:bg-white/10"
    />
  );
}

function PriceEdit({ line, currency, onCommit }: { line: Line; currency: string; onCommit: (price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const changed = line.unitPrice !== line.listPrice;

  function commit() {
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== line.unitPrice) onCommit(parsed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
        className="h-7 w-28 rounded-md border border-emerald-400/40 bg-white/10 px-2 font-mono text-xs outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setText(String(line.unitPrice));
        setEditing(true);
      }}
      className="group flex items-center gap-1.5 font-mono text-[11px] text-white/45 hover:text-white"
      aria-label="Change price for this sale"
    >
      {changed ? <span className="text-white/30 line-through">{money(currency, line.listPrice)}</span> : null}
      <span className={changed ? "font-semibold text-amber-300" : undefined}>{money(currency, line.unitPrice)} each</span>
      <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

export function CheckoutPanel(props: Props) {
  const { currency, lines, draft, customer, totals, method, cashReceived, deposit, depositMethod, loyaltyOn, hint, error, submitting, canCharge } = props;
  const later = method === "LATER";
  const cashNumber = cashReceived.trim() === "" ? null : Number(cashReceived);
  const change = method === "CASH" && cashNumber !== null && Number.isFinite(cashNumber) && cashNumber > totals.total ? cashNumber - totals.total : null;
  const depositNumber = later ? Number(deposit) || 0 : 0;
  const owes = customer?.balance && customer.balance > 0 ? customer.balance : 0;

  const quickCash = useMemo(() => {
    const values = [totals.total, ...[100, 500, 1000, 5000].map((step) => Math.ceil(totals.total / step) * step)];
    return [...new Set(values)].filter((value) => value > 0).slice(0, 4);
  }, [totals.total]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-sm font-semibold">Current sale</p>
          <p className="text-xs text-white/40">{totals.itemCount} item{totals.itemCount === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-1">
          {lines.length > 0 ? (
            <button type="button" aria-label="Clear sale" onClick={() => window.confirm("Clear this sale?") && props.onClear()} className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          {props.onClose ? (
            <button type="button" aria-label="Close" onClick={props.onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/[0.06] lg:hidden">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center text-white/30">
            <ShoppingCart className="h-10 w-10" />
            <p className="text-sm">Tap a product or scan a barcode</p>
            <div className="flex flex-wrap justify-center gap-2 text-[11px]">
              {[["F2", "search"], ["F4", "customer"], ["F8", "charge"], ["F9", "hold"]].map(([key, label]) => (
                <span key={key} className="rounded-full border border-white/10 px-2.5 py-1"><kbd className="font-mono text-white/60">{key}</kbd> {label}</span>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.div key={line.productId} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-2 border-b border-white/[0.05] py-3">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-white/90">{line.name}</p>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{(line.unitPrice * line.quantity).toLocaleString()}</span>
                    <button type="button" aria-label="Remove item" onClick={() => props.onRemove(line.productId)} className="shrink-0 text-white/25 hover:text-red-400"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <PriceEdit line={line} currency={currency} onCommit={(price) => props.onPrice(line.productId, price)} />
                    <div className="flex items-center rounded-lg bg-white/[0.06]">
                      <button type="button" aria-label="Remove one" onClick={() => props.onQty(line.productId, line.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"><Minus className="h-3.5 w-3.5" /></button>
                      <QtyField value={line.quantity} onCommit={(quantity) => props.onQty(line.productId, quantity)} />
                      <button type="button" aria-label="Add one" onClick={() => props.onQty(line.productId, line.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {lines.length > 0 ? (
          <>
            <div className="space-y-2">
              <button type="button" onClick={props.onCustomer} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.07]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><Users className="h-4 w-4 text-white/60" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{customer?.name ?? "Walk-in customer"}</span>
                  <span className="block truncate text-[11px] text-white/40">
                    {customer ? [customer.loyaltyPoints ? `${customer.loyaltyPoints} pts` : null, customer.phone].filter(Boolean).join(" · ") || "Tap to change" : "Tap to choose or add a customer (F4)"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </button>
              {owes > 0 ? (
                <Link href={`/merchant/customers/${customer!.id}`} className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{customer!.name} already owes {money(currency, owes)}. Collect it first?</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Link>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-white/40">Payment</p>
              <div className="grid grid-cols-5 gap-1.5">
                {METHOD_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => props.onMethod(item.value)}
                    className={cn("flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors", method === item.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]")}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-[10px] leading-none">{item.label}</span>
                  </button>
                ))}
              </div>

              {method === "CASH" ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Input inputMode="decimal" value={cashReceived} onChange={(event) => props.onCash(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Cash received (optional)" className={cn("h-10 font-mono", field)} />
                  <div className="flex flex-wrap gap-1.5">
                    {quickCash.map((value) => (
                      <button key={value} type="button" onClick={() => props.onCash(String(value))} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/[0.06]">
                        {value === totals.total ? "Exact" : money(currency, value)}
                      </button>
                    ))}
                  </div>
                  {change !== null ? (
                    <div className="rounded-lg bg-amber-400/10 px-3 py-2 text-center">
                      <p className="text-[11px] text-amber-200/70">Change due</p>
                      <p className="font-mono text-2xl font-bold text-amber-300">{money(currency, change)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {later ? (
                <div className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                  <p className="text-xs text-amber-200/90">The customer takes the goods now and pays later. The sale stays in Unpaid until collected. Only the owner can record credit sales.</p>
                  <Input inputMode="decimal" value={deposit} onChange={(event) => props.onDeposit(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Deposit paid now (optional)" className={cn("h-10 font-mono", field)} />
                  {depositNumber > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {DEPOSIT_OPTIONS.map((item) => (
                        <button key={item.value} type="button" onClick={() => props.onDepositMethod(item.value)} className={cn("rounded-full border px-3 py-1 text-xs", depositMethod === item.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-white/60")}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {depositNumber > 0 && depositNumber < totals.total ? <p className="text-xs text-white/60">{money(currency, totals.total - depositNumber)} will still be owed.</p> : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-white/40">Discount</p>
              <div className="flex gap-2">
                <div className="flex shrink-0 rounded-lg border border-white/10 p-0.5">
                  {(["amount", "percent"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => props.onDraft({ discountMode: mode })} className={cn("rounded-md px-2.5 text-xs font-medium", draft.discountMode === mode ? "bg-white/15 text-white" : "text-white/45")}>
                      {mode === "amount" ? currency : "%"}
                    </button>
                  ))}
                </div>
                <Input inputMode="decimal" value={draft.discountValue} onChange={(event) => props.onDraft({ discountValue: event.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" className={cn("h-9 font-mono", field)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15].map((percent) => (
                  <button key={percent} type="button" onClick={() => props.onDraft({ discountMode: "percent", discountValue: String(percent) })} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/[0.06]">{percent}%</button>
                ))}
                {draft.discountValue ? <button type="button" onClick={() => props.onDraft({ discountValue: "" })} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">Clear</button> : null}
              </div>

              {loyaltyOn && totals.maxRedeem > 0 ? (
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-white/40">Redeem points ({customer?.loyaltyPoints} available)</p>
                  <div className="flex gap-2">
                    <Input inputMode="numeric" value={totals.redeem || ""} onChange={(event) => props.onRedeem(Math.max(0, Math.min(totals.maxRedeem, Number(event.target.value.replace(/\D/g, "")) || 0)))} placeholder="0" className={cn("h-9 font-mono", field)} />
                    <Button type="button" variant="outline" onClick={() => props.onRedeem(totals.maxRedeem)} className="h-9 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10">Max</Button>
                  </div>
                  {totals.redeem > 0 ? <p className="text-xs text-emerald-300">{totals.redeem} points take {money(currency, totals.redeemValue)} off.</p> : null}
                </div>
              ) : null}
            </div>

            <Input value={draft.note} onChange={(event) => props.onDraft({ note: event.target.value.slice(0, 200) })} placeholder="Add a note to this sale (optional)" className={cn("h-9 text-xs", field)} />
          </>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/[0.06] bg-[#0F1420] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/45"><span>Subtotal</span><span className="font-mono">{money(currency, totals.subtotal)}</span></div>
          {totals.manual + totals.redeemValue > 0 ? <div className="flex justify-between text-xs text-emerald-300"><span>Discount</span><span className="font-mono">-{money(currency, totals.manual + totals.redeemValue)}</span></div> : null}
          <div className="flex items-end justify-between pt-1">
            <span className="text-sm text-white/50">{later ? "Amount due" : "Total"}</span>
            <span className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">{money(currency, totals.total)}</span>
          </div>
        </div>
        {hint && lines.length > 0 ? <p className="text-xs text-amber-300">{hint}</p> : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="outline" onClick={props.onHold} disabled={lines.length === 0} className="h-12 border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
            <Pause className="mr-2 h-4 w-4" /> Hold
          </Button>
          <Button onClick={props.onCharge} disabled={!canCharge} className="h-12 bg-emerald-500 text-base font-bold text-[#0B0F1A] hover:bg-emerald-400">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : later ? "Save as unpaid" : `Charge ${money(currency, totals.total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}