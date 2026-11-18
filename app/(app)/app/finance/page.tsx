"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ChevronLeft, ChevronRight, Lightbulb, Pencil, PiggyBank, Plus, Search, Trash2, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, ProgressBar, Section, SectionLink, StatCard, type Tone } from "@/components/app/kit";
import { useCreateFinanceTransaction, useCreateTransfer, useDeleteFinanceTransaction, useFinanceCategories, useFinanceSummary, useUpdateFinanceTransaction } from "@/lib/hooks/use-finance";
import { useMoney } from "@/lib/hooks/use-currency";
import { cn } from "@/lib/utils";
import type { FinanceAccount, FinanceCategory, FinanceInsight, FinanceTransaction, TxKind } from "@/types/finance";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const INSIGHT_STYLE: Record<FinanceInsight["tone"], string> = {
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  danger: "border-destructive/30 bg-destructive/5",
  info: "border-primary/20 bg-primary/5",
};

const pad = (value: number) => String(value).padStart(2, "0");
const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

interface TxForm {
  kind: TxKind;
  amount: string;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  date: string;
}

function TransactionDialog({ editing, accounts, categories, onClose }: { editing: FinanceTransaction | null; accounts: FinanceAccount[]; categories: FinanceCategory[]; onClose: () => void }) {
  const create = useCreateFinanceTransaction();
  const update = useUpdateFinanceTransaction();
  const transfer = useCreateTransfer();
  const firstAccount = accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? "";

  const [form, setForm] = useState<TxForm>(() =>
    editing
      ? { kind: editing.type, amount: String(editing.amount), description: editing.description, categoryId: editing.categoryId ?? "", accountId: editing.accountId ?? "", toAccountId: "", date: editing.date }
      : { kind: "expense", amount: "", description: "", categoryId: "", accountId: firstAccount, toAccountId: accounts.find((account) => account.id !== firstAccount)?.id ?? "", date: todayKey() }
  );
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending || transfer.isPending;
  const kinds: TxKind[] = !editing && accounts.length >= 2 ? ["expense", "income", "transfer"] : ["expense", "income"];
  const options = categories.filter((category) => category.type === (form.kind === "income" ? "INCOME" : "EXPENSE"));
  const set = <K extends keyof TxForm>(key: K, value: TxForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError("Enter an amount greater than zero.");
    setError(null);
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };

    if (form.kind === "transfer") {
      if (!form.accountId || !form.toAccountId) return setError("Choose both accounts.");
      return transfer.mutate({ fromAccountId: form.accountId, toAccountId: form.toAccountId, amount, date: form.date, note: form.description.trim() || undefined }, outcome);
    }

    const type = form.kind === "income" ? "INCOME" : "EXPENSE";
    if (editing) {
      return update.mutate({ id: editing.id, data: { type, amount, description: form.description.trim(), categoryId: form.categoryId || null, accountId: form.accountId || null, date: form.date } }, outcome);
    }
    create.mutate({ type, amount, description: form.description.trim(), categoryId: form.categoryId || undefined, accountId: form.accountId || undefined, date: form.date }, outcome);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="flex gap-2">
            {kinds.map((kind) => (
              <Button key={kind} type="button" size="sm" variant={form.kind === kind ? "default" : "outline"} className="flex-1 capitalize" onClick={() => set("kind", kind)}>{kind}</Button>
            ))}
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} autoFocus required />
          </div>
          <div className="space-y-1">
            <Label>{form.kind === "transfer" ? "Note (optional)" : "Description"}</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={255} required={form.kind !== "transfer"} placeholder={form.kind === "transfer" ? "e.g. Move to savings" : "What was this for?"} />
          </div>
          {form.kind !== "transfer" && (
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">No category</option>
                {options.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          )}
          <div className={cn("grid gap-3", form.kind === "transfer" && "grid-cols-2")}>
            <div className="space-y-1">
              <Label>{form.kind === "transfer" ? "From" : "Account"}</Label>
              <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>
                {form.kind !== "transfer" && <option value="">No account</option>}
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </div>
            {form.kind === "transfer" && (
              <div className="space-y-1">
                <Label>To</Label>
                <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.toAccountId} onChange={(e) => set("toAccountId", e.target.value)}>
                  {accounts.filter((account) => account.id !== form.accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.date} max={todayKey()} onChange={(e) => set("date", e.target.value)} required />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FinancePage() {
  const { money, currency } = useMoney();
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const { data, isLoading, isError, refetch } = useFinanceSummary(period.month, period.year);
  const { data: categories = [] } = useFinanceCategories();
  const remove = useDeleteFinanceTransaction();

  const [dialog, setDialog] = useState<{ id: number; editing: FinanceTransaction | null } | null>(null);
  const [kind, setKind] = useState<"all" | TxKind>("all");
  const [query, setQuery] = useState("");

  const transactions = data?.transactions;
  const accounts = data?.accounts;
  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();

  const accountName = useMemo(() => new Map((accounts ?? []).map((account) => [account.id, account.name])), [accounts]);
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, FinanceTransaction[]>();
    (transactions ?? [])
      .filter((t) => (kind === "all" || t.type === kind) && (!needle || t.description.toLowerCase().includes(needle) || t.category.toLowerCase().includes(needle)))
      .forEach((t) => map.set(t.date, [...(map.get(t.date) ?? []), t]));
    return [...map.entries()];
  }, [transactions, kind, query]);

  function shiftMonth(delta: number) {
    setPeriod((current) => {
      const index = current.year * 12 + (current.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your finances.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const { summary } = data;
  const budgetPercent = summary.monthlyBudget > 0 ? Math.round((summary.totalSpent / summary.monthlyBudget) * 100) : null;
  const spendTone: Tone = budgetPercent === null ? "default" : budgetPercent >= 100 ? "danger" : budgetPercent >= 80 ? "warning" : "default";
  const homeBalance = data.accounts.filter((account) => account.currency === currency).reduce((sum, account) => sum + account.balance, 0);
  const otherCurrencies = data.accounts.filter((account) => account.currency !== currency).length;
  const limits = new Map(summary.categoryBreakdown.map((row) => [row.categoryId, row.budget]));
  const maxDaily = Math.max(...summary.daily, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="Finance"
        subtitle="Income, spending and where your money goes."
        actions={
          <>
            <Button variant="outline" asChild><Link href="/app/finance/budget"><TrendingUp className="mr-1.5 h-4 w-4" /> Budget</Link></Button>
            <Button onClick={() => setDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Add</Button>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <p className="min-w-[9rem] text-center text-sm font-semibold">{MONTHS[period.month - 1]} {period.year}</p>
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={isCurrent} onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        {!isCurrent && <Button variant="ghost" size="sm" onClick={() => setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() })}>This month</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={ArrowUpCircle} label="Income" value={money(summary.totalIncome)} tone="success" hint={summary.previous.totalIncome > 0 ? `Last month ${money(summary.previous.totalIncome)}` : undefined} />
        <StatCard
          icon={ArrowDownCircle}
          label="Spent"
          value={money(summary.totalSpent)}
          tone={spendTone}
          progress={budgetPercent ?? undefined}
          hint={budgetPercent === null ? "No budget set" : `${budgetPercent}% of ${money(summary.monthlyBudget)}`}
          href="/app/finance/budget"
        />
        <StatCard
          icon={PiggyBank}
          label="Net saved"
          value={money(summary.savings)}
          tone={summary.savings < 0 ? "danger" : summary.savingsRate >= 20 ? "success" : "default"}
          hint={summary.totalIncome > 0 ? `${summary.savingsRate.toFixed(0)}% of income` : undefined}
        />
        <StatCard icon={Wallet} label="Total balance" value={money(homeBalance)} hint={`${data.accounts.length} ${data.accounts.length === 1 ? "account" : "accounts"}${otherCurrencies ? ` · ${otherCurrencies} in other currencies` : ""}`} href="/app/finance/budget" />
      </div>

      {summary.insights.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {summary.insights.map((insight) => (
            <div key={insight.text} className={cn("flex items-start gap-3 rounded-xl border p-3", INSIGHT_STYLE[insight.tone])}>
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">{insight.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Daily spending" icon={TrendingUp}>
            {summary.totalSpent === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No spending recorded this month.</p>
            ) : (
              <>
                <div className="flex h-28 items-end gap-[2px]">
                  {summary.daily.map((value, index) => (
                    <div
                      key={index}
                      title={`${index + 1} ${MONTHS[period.month - 1]}: ${money(value)}`}
                      className={cn("flex-1 rounded-sm", value > 0 ? "bg-primary" : "bg-muted", isCurrent && index + 1 === summary.elapsedDays && "ring-1 ring-primary")}
                      style={{ height: `${Math.max(value > 0 ? 6 : 3, (value / maxDaily) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>1</span><span>{Math.ceil(summary.daysInMonth / 2)}</span><span>{summary.daysInMonth}</span></div>
              </>
            )}
          </Section>

          <Section title={`Transactions · ${data.transactions.length}`} icon={ArrowLeftRight}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 pl-9" />
              </div>
              {(["all", "expense", "income", "transfer"] as const).map((key) => (
                <button key={key} type="button" onClick={() => setKind(key)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", kind === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{key}</button>
              ))}
            </div>

            {groups.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title={data.transactions.length === 0 ? "No transactions yet" : "Nothing matches"} body={data.transactions.length === 0 ? "Record your first income or expense." : "Try a different filter."} action={data.transactions.length === 0 ? <Button size="sm" onClick={() => setDialog({ id: Date.now(), editing: null })}>Add transaction</Button> : undefined} />
            ) : (
              <div className="space-y-4">
                {groups.map(([date, items]) => (
                  <div key={date} className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">{dayLabel(date)}</p>
                    {items.map((t) => (
                      <div key={t.id} className="group flex items-center gap-3 rounded-lg border px-3 py-2.5">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.type === "expense" ? "bg-destructive/10 text-destructive" : t.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary")}>
                          {t.type === "expense" ? <ArrowDownCircle className="h-4 w-4" /> : t.type === "income" ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.description}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.category}
                            {t.accountId && ` · ${accountName.get(t.accountId) ?? "Account"}`}
                            {t.type === "transfer" && t.toAccountId && ` → ${accountName.get(t.toAccountId) ?? "Account"}`}
                          </p>
                        </div>
                        <p className={cn("shrink-0 text-sm font-semibold tabular-nums", t.type === "expense" && "text-destructive", t.type === "income" && "text-emerald-600")}>
                          {t.type === "expense" ? "-" : t.type === "income" ? "+" : ""}{money(t.amount)}
                        </p>
                        <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          {t.type !== "transfer" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit" onClick={() => setDialog({ id: Date.now(), editing: t })}><Pencil className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete" disabled={remove.isPending} onClick={() => window.confirm(`Delete "${t.description}"? Your account balance will be adjusted.`) && remove.mutate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Spending by category" icon={TrendingUp} action={<SectionLink href="/app/finance/budget">Set budget</SectionLink>}>
            {summary.spendingByCategory.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nothing spent yet.</p>
            ) : (
              <div className="space-y-4">
                {summary.spendingByCategory.slice(0, 8).map((row) => {
                  const cap = row.categoryId ? limits.get(row.categoryId) : undefined;
                  const over = !!cap && cap > 0 && row.spent > cap;
                  const percent = cap && cap > 0 ? (row.spent / cap) * 100 : summary.totalSpent > 0 ? (row.spent / summary.totalSpent) * 100 : 0;
                  return (
                    <div key={row.categoryId ?? "none"} className="space-y-1.5">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate">{row.category}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{money(row.spent)}{cap && cap > 0 ? ` / ${money(cap)}` : ""}</span>
                      </div>
                      <ProgressBar value={percent} tone={over ? "danger" : "default"} />
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Accounts" icon={Wallet} action={<SectionLink href="/app/finance/budget">Manage</SectionLink>}>
            {data.accounts.length === 0 ? (
              <EmptyState icon={Wallet} title="No accounts yet" body="Add a bank, cash or mobile money account to track balances." action={<Button size="sm" variant="outline" asChild><Link href="/app/finance/budget">Add account</Link></Button>} />
            ) : (
              <div className="space-y-2">
                {data.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.type.replace("_", " ").toLowerCase()}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{money(account.balance, account.currency)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {dialog && <TransactionDialog key={dialog.id} editing={dialog.editing} accounts={data.accounts} categories={categories} onClose={() => setDialog(null)} />}
    </div>
  );
}