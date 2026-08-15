"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Plus } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinanceSummary, useFinanceCategories, useFinanceAccounts } from "@/lib/hooks/use-life-data";
import { api } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function BudgetPage() {
  const { data, isLoading } = useFinanceSummary();
  const { data: categories = [] } = useFinanceCategories();
  const { data: accounts = [] } = useFinanceAccounts();
  const qc = useQueryClient();

  const createCategory = useMutation({
    mutationFn: (d: { name: string; type: string; color?: string }) => api.post("/finance/categories", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financeCategories"] }),
  });

  const createBudget = useMutation({
    mutationFn: (d: any) => api.post("/finance/budgets", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  });

  const createAccount = useMutation({
    mutationFn: (d: { name: string; type: string; currency: string; initialBalance?: number }) =>
      api.post("/finance/accounts", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financeAccounts"] }),
  });

  const summary = data?.summary;
  const categoryBreakdown = summary?.categoryBreakdown ?? [];
  const totalCategoryBudget = categoryBreakdown.reduce((acc, c) => acc + c.budget, 0);

  const [catOpen, setCatOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [catForm, setCatForm] = useState({ name: "", type: "EXPENSE" as "INCOME" | "EXPENSE", color: "" });
  const [accountForm, setAccountForm] = useState({ name: "", type: "BANK", currency: "USD", initialBalance: "" });

  // Budget form with dynamic category limit items
  const [budgetForm, setBudgetForm] = useState({
    name: "Monthly Budget",
    period: "MONTHLY",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
    totalLimit: "",
    items: [] as { categoryId: string; limitAmount: string }[],
  });

  function addBudgetItem() {
    setBudgetForm((f) => ({ ...f, items: [...f.items, { categoryId: "", limitAmount: "" }] }));
  }

  function removeBudgetItem(idx: number) {
    setBudgetForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function updateBudgetItem(idx: number, field: "categoryId" | "limitAmount", value: string) {
    setBudgetForm((f) => ({
      ...f,
      items: f.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));
  }

  function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault();
    createBudget.mutate(
      {
        name: budgetForm.name,
        period: budgetForm.period,
        startDate: new Date(budgetForm.startDate).toISOString(),
        endDate: new Date(budgetForm.endDate).toISOString(),
        totalLimit: parseFloat(budgetForm.totalLimit) || 0,
        items: budgetForm.items
          .filter((i) => i.categoryId && i.limitAmount)
          .map((i) => ({ categoryId: i.categoryId, limitAmount: parseFloat(i.limitAmount) })),
      },
      {
        onSuccess: () => {
          setBudgetOpen(false);
          setBudgetForm({
            name: "Monthly Budget",
            period: "MONTHLY",
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
            totalLimit: "",
            items: [],
          });
        },
      }
    );
  }

  if (isLoading) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Budget Planner
          </h1>
          <p className="text-muted-foreground mt-1">Manage categories, accounts, and monthly budget limits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAccountOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Account
          </Button>
          <Button variant="outline" onClick={() => setCatOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Category
          </Button>
          <Button onClick={() => setBudgetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Budget
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Monthly budget", value: formatCurrency(summary?.monthlyBudget ?? 0) },
          { label: "Category total", value: formatCurrency(totalCategoryBudget) },
          { label: "Difference", value: formatCurrency((summary?.monthlyBudget ?? 0) - totalCategoryBudget) },
        ].map((s) => (
          <Card key={s.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Category Budgets
              </CardTitle>
              <Badge variant="secondary">{categoryBreakdown.length} categories</Badge>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No budget yet.</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Category first
                    </Button>
                    <Button size="sm" onClick={() => setBudgetOpen(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Then budget
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[360px]">
                  <div className="space-y-3 pt-1">
                    {categoryBreakdown.map((cat) => {
                      const pct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
                      const over = cat.spent > cat.budget;
                      return (
                        <div key={cat.category} className="space-y-1 rounded-lg border border-border/60 bg-card/60 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{cat.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}
                            </p>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                          </div>
                          {over && <p className="text-[11px] text-destructive">Over by {formatCurrency(cat.spent - cat.budget)}</p>}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Accounts
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setAccountOpen(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {(accounts as any[]).length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No accounts yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setAccountOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add account
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(accounts as any[]).map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-3">
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.type} · {acc.currency}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(acc.balance)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCategory.mutate(
                { name: catForm.name, type: catForm.type, color: catForm.color || undefined },
                { onSuccess: () => { setCatOpen(false); setCatForm({ name: "", type: "EXPENSE", color: "" }); } }
              );
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="e.g. Groceries" value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["EXPENSE", "INCOME"] as const).map((t) => (
                  <Button key={t} type="button" variant={catForm.type === t ? "default" : "outline"} size="sm" className="flex-1"
                    onClick={() => setCatForm((f) => ({ ...f, type: t }))}>
                    {t === "INCOME" ? "Income" : "Expense"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Color (optional)</Label>
              <Input type="color" value={catForm.color || "#6366f1"}
                onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} className="h-10" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {createCategory.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add account</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAccount.mutate(
                {
                  name: accountForm.name,
                  type: accountForm.type,
                  currency: accountForm.currency,
                  initialBalance: accountForm.initialBalance ? parseFloat(accountForm.initialBalance) : undefined,
                },
                { onSuccess: () => { setAccountOpen(false); setAccountForm({ name: "", type: "BANK", currency: "USD", initialBalance: "" }); } }
              );
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <Label>Account name</Label>
              <Input placeholder="e.g. Main checking" value={accountForm.name}
                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={accountForm.type} onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value }))}>
                {["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"].map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input placeholder="USD" value={accountForm.currency}
                  onChange={(e) => setAccountForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={10} />
              </div>
              <div className="space-y-1">
                <Label>Opening balance</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={accountForm.initialBalance}
                  onChange={(e) => setAccountForm((f) => ({ ...f, initialBalance: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Budget Dialog */}
      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create budget</DialogTitle></DialogHeader>
          <form onSubmit={handleBudgetSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Budget name</Label>
              <Input value={budgetForm.name} onChange={(e) => setBudgetForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input type="date" value={budgetForm.startDate}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input type="date" value={budgetForm.endDate}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Total limit</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={budgetForm.totalLimit}
                onChange={(e) => setBudgetForm((f) => ({ ...f, totalLimit: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category limits</Label>
                <Button type="button" size="sm" variant="ghost" onClick={addBudgetItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {budgetForm.items.length === 0 && (
                <p className="text-xs text-muted-foreground">Add category limits to track spending by category.</p>
              )}
              {budgetForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                    value={item.categoryId}
                    onChange={(e) => updateBudgetItem(idx, "categoryId", e.target.value)}
                  >
                    <option value="">Select category</option>
                    {(categories as any[]).filter((c) => c.type === "EXPENSE").map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Limit"
                    className="w-28"
                    value={item.limitAmount}
                    onChange={(e) => updateBudgetItem(idx, "limitAmount", e.target.value)}
                  />
                  <button type="button" className="text-muted-foreground hover:text-destructive text-sm"
                    onClick={() => removeBudgetItem(idx)}>×</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBudgetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBudget.isPending}>
                {createBudget.isPending ? "Saving..." : "Create budget"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}