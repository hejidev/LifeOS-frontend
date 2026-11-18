"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Tags, Trash2, TrendingUp, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, ProgressBar, Section } from "@/components/app/kit";
import {
  useCreateFinanceAccount, useCreateFinanceCategory, useDeleteFinanceAccount, useDeleteFinanceCategory,
  useFinanceCategories, useFinanceSummary, useSaveBudget, useUpdateFinanceAccount,
} from "@/lib/hooks/use-finance";
import { useMoney } from "@/lib/hooks/use-currency";
import { cn } from "@/lib/utils";
import type { FinanceAccount } from "@/types/finance";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"];
const pad = (value: number) => String(value).padStart(2, "0");

function AccountDialog({ editing, defaultCurrency, onClose }: { editing: FinanceAccount | null; defaultCurrency: string; onClose: () => void }) {
  const create = useCreateFinanceAccount();
  const update = useUpdateFinanceAccount();
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    type: editing?.type ?? "BANK",
    currency: editing?.currency ?? defaultCurrency,
    balance: editing ? String(editing.balance) : "",
  });
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };
    const amount = form.balance.trim() === "" ? undefined : Number(form.balance);
    if (amount !== undefined && !Number.isFinite(amount)) return setError("Enter a valid balance.");

    if (editing) update.mutate({ id: editing.id, data: { name: form.name.trim(), type: form.type, currency: form.currency, balance: amount } }, outcome);
    else create.mutate({ name: form.name.trim(), type: form.type, currency: form.currency, initialBalance: amount }, outcome);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. GTBank, Cash, Opay" maxLength={100} required autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))} maxLength={3} required />
            </div>
            <div className="space-y-1">
              <Label>{editing ? "Current balance" : "Opening balance"}</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} placeholder="0" />
            </div>
          </div>
          {editing && <p className="text-xs text-muted-foreground">Set the balance to what the account really holds today. New transactions adjust it from there.</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending || form.currency.length !== 3}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateFinanceCategory();
  const [form, setForm] = useState({ name: "", type: "EXPENSE" as "EXPENSE" | "INCOME" });
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
        <form
          className="space-y-3 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ name: form.name.trim(), type: form.type }, { onSuccess: onClose, onError: (err: Error) => setError(err.message) });
          }}
        >
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={64} required autoFocus />
          </div>
          <div className="flex gap-2">
            {(["EXPENSE", "INCOME"] as const).map((type) => (
              <Button key={type} type="button" size="sm" variant={form.type === type ? "default" : "outline"} className="flex-1 capitalize" onClick={() => setForm((f) => ({ ...f, type }))}>{type.toLowerCase()}</Button>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BudgetPage() {
  const { money, currency } = useMoney();
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data, isLoading, isError, refetch } = useFinanceSummary(period.month, period.year);
  const { data: categories = [] } = useFinanceCategories();
  const saveBudget = useSaveBudget();
  const removeAccount = useDeleteFinanceAccount();
  const removeCategory = useDeleteFinanceCategory();

  const [limits, setLimits] = useState<Record<string, string>>({});
  const [total, setTotal] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDialog, setAccountDialog] = useState<{ id: number; editing: FinanceAccount | null } | null>(null);
  const [categoryDialog, setCategoryDialog] = useState(false);

  const summary = data?.summary;
  const seed = JSON.stringify([summary?.monthlyBudget, summary?.categoryBreakdown.map((row) => [row.categoryId, row.budget])]);

  useEffect(() => {
    if (!summary) return;
    setLimits(Object.fromEntries(summary.categoryBreakdown.map((row) => [row.categoryId, String(row.budget)])));
    setTotal(summary.monthlyBudget > 0 ? String(summary.monthlyBudget) : "");
    setSaved(false);
    setError(null);
  }, [seed, period.month, period.year]);

  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");
  const incomeCategories = categories.filter((category) => category.type === "INCOME");
  const spentBy = useMemo(() => new Map((summary?.spendingByCategory ?? []).map((row) => [row.categoryId, row.spent])), [summary]);
  const allocated = expenseCategories.reduce((sum, category) => sum + (Number(limits[category.id]) || 0), 0);
  const totalNumber = Number(total) || 0;

  function shiftMonth(delta: number) {
    setPeriod((current) => {
      const index = current.year * 12 + (current.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  function submit() {
    setError(null);
    setSaved(false);
    const days = new Date(period.year, period.month, 0).getDate();
    const items = expenseCategories
      .map((category) => ({ categoryId: category.id, limitAmount: Number(limits[category.id]) || 0 }))
      .filter((item) => item.limitAmount > 0);

    saveBudget.mutate(
      {
        name: `${MONTHS[period.month - 1]} ${period.year} budget`,
        period: "MONTHLY",
        startDate: `${period.year}-${pad(period.month)}-01`,
        endDate: `${period.year}-${pad(period.month)}-${pad(days)}`,
        totalLimit: totalNumber > 0 ? totalNumber : allocated,
        items,
      },
      { onSuccess: () => setSaved(true), onError: (err: Error) => setError(err.message) }
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your budget.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data || !summary) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Budget & accounts"
        subtitle="Plan each month, and manage where your money lives."
        actions={<Button variant="outline" asChild><Link href="/app/finance"><ArrowLeft className="mr-1.5 h-4 w-4" /> Finance</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Section
          title="Monthly budget"
          icon={TrendingUp}
          className="lg:col-span-3"
          action={
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)}>‹</Button>
              <span className="min-w-[7.5rem] text-center text-xs font-semibold">{MONTHS[period.month - 1]} {period.year}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)}>›</Button>
            </div>
          }
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Total for the month ({currency})</Label>
              <Input type="number" inputMode="decimal" min="0" value={total} onChange={(e) => { setTotal(e.target.value); setSaved(false); }} placeholder={allocated > 0 ? String(allocated) : "e.g. 150000"} className="w-48" />
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              Allocated to categories: <strong className="text-foreground">{money(allocated)}</strong>
              {totalNumber > 0 && ` · ${totalNumber >= allocated ? `${money(totalNumber - allocated)} unallocated` : `${money(allocated - totalNumber)} over the total`}`}
            </p>
          </div>

          {expenseCategories.length === 0 ? (
            <EmptyState icon={Tags} title="No expense categories" body="Add a category first, then give it a limit." />
          ) : (
            <div className="space-y-2">
              {expenseCategories.map((category) => {
                const spent = spentBy.get(category.id) ?? 0;
                const cap = Number(limits[category.id]) || 0;
                return (
                  <div key={category.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{category.name}</span>
                        <span className={cn("shrink-0 text-xs tabular-nums", cap > 0 && spent > cap ? "text-destructive" : "text-muted-foreground")}>{money(spent)} spent</span>
                      </div>
                      {cap > 0 && <ProgressBar value={(spent / cap) * 100} tone={spent > cap ? "danger" : "default"} />}
                    </div>
                    <Input type="number" inputMode="decimal" min="0" placeholder="No limit" value={limits[category.id] ?? ""} onChange={(e) => { setLimits((current) => ({ ...current, [category.id]: e.target.value })); setSaved(false); }} className="h-9 w-28" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={saveBudget.isPending}>{saveBudget.isPending ? "Saving..." : "Save budget"}</Button>
            {saved && <span className="text-xs text-emerald-600">Budget saved</span>}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </Section>

        <div className="space-y-4 lg:col-span-2">
          <Section title="Accounts" icon={Wallet} action={<Button size="sm" variant="outline" onClick={() => setAccountDialog({ id: Date.now(), editing: null })}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>}>
            {data.accounts.length === 0 ? (
              <EmptyState icon={Wallet} title="No accounts yet" body="Add the places your money sits: bank, cash, mobile money." />
            ) : (
              <div className="space-y-2">
                {data.accounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-2 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.type.replace("_", " ").toLowerCase()} · {account.currency}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{money(account.balance, account.currency)}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit account" onClick={() => setAccountDialog({ id: Date.now(), editing: account })}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete account" onClick={() => window.confirm(`Delete ${account.name}? Its transactions stay, but won't be linked to an account.`) && removeAccount.mutate(account.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Categories" icon={Tags} action={<Button size="sm" variant="outline" onClick={() => setCategoryDialog(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>}>
            {[{ label: "Expense", items: expenseCategories }, { label: "Income", items: incomeCategories }].map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((category) => (
                    <span key={category.id} className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs">
                      {category.name}
                      <button type="button" aria-label={`Delete ${category.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => window.confirm(`Delete "${category.name}"? Past transactions become uncategorized.`) && removeCategory.mutate(category.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {group.items.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
                </div>
              </div>
            ))}
          </Section>
        </div>
      </div>

      {accountDialog && <AccountDialog key={accountDialog.id} editing={accountDialog.editing} defaultCurrency={currency} onClose={() => setAccountDialog(null)} />}
      {categoryDialog && <CategoryDialog onClose={() => setCategoryDialog(false)} />}
    </div>
  );
}