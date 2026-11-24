"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { money } from "@/components/merchant/ops-ui";
import { useCreateCustomer } from "@/lib/hooks/use-life-data";
import type { Customer } from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";

const field = "border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 focus-visible:ring-emerald-400/40";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedId: string;
  currency: string;
  onSelect: (customer: Customer | null) => void;
}

export function CustomerDialog({ open, onOpenChange, customers, selectedId, currency, onSelect }: Props) {
  const create = useCreateCustomer();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setAdding(false);
      setError(null);
    }
  }, [open]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((item) => !needle || item.name.toLowerCase().includes(needle) || (item.phone ?? "").includes(needle)).slice(0, 60);
  }, [customers, query]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const phone = form.phone.trim();
    try {
      const result = await create.mutateAsync({ name: form.name.trim(), ...(phone ? { phone } : {}) });
      setForm({ name: "", phone: "" });
      setAdding(false);
      onSelect((result?.customer ?? result) as Customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the customer.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-[#0F1420] p-0 text-white">
        <DialogHeader className="border-b border-white/[0.06] p-4"><DialogTitle>Customer</DialogTitle></DialogHeader>
        <div className="space-y-3 border-b border-white/[0.06] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or phone" className={cn("h-10 pl-9", field)} autoFocus />
          </div>
          {adding ? (
            <form onSubmit={add} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className={cn("h-10", field)} required autoFocus />
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone, for WhatsApp receipts (optional)" inputMode="tel" className={cn("h-10", field)} />
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || !form.name.trim()} className="flex-1 bg-emerald-500 text-[#0B0F1A] hover:bg-emerald-400">{create.isPending ? "Adding..." : "Add and select"}</Button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-white/70 hover:bg-white/[0.04]">
              <UserPlus className="h-4 w-4" /> New customer
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button type="button" onClick={() => onSelect(null)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/[0.06]", !selectedId && "bg-white/[0.06]")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08]"><Users className="h-4 w-4 text-white/60" /></span>
            Walk-in customer
          </button>
          {shown.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06]", selectedId === item.id && "bg-white/[0.06]")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">{item.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block truncate text-[11px] text-white/40">{[item.phone, item.loyaltyPoints ? `${item.loyaltyPoints} pts` : null].filter(Boolean).join(" · ") || "No contact on file"}</span>
              </span>
              {item.balance && item.balance > 0 ? <span className="shrink-0 text-[11px] font-medium text-amber-300">owes {money(currency, item.balance)}</span> : null}
            </button>
          ))}
          {shown.length === 0 ? <p className="py-8 text-center text-sm text-white/40">No customers match.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}