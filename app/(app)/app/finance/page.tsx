"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Wallet, TrendingUp, PiggyBank, ArrowDownCircle,
    ArrowUpCircle, Plus,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    useFinanceSummary,
    useFinanceCategories,
    useCreateFinanceTransaction,
    useDeleteFinanceTransaction,
} from "@/lib/hooks/use-life-data";
import { formatCurrency } from "@/lib/utils";
import type { FinanceSummary, Transaction } from "@/types/life";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function FinancePage() {
    const { data, isLoading } = useFinanceSummary();
    const { data: categories = [] } = useFinanceCategories();
    const createTx = useCreateFinanceTransaction();
    const deleteTx = useDeleteFinanceTransaction();

    const [txOpen, setTxOpen] = useState(false);
    const [txForm, setTxForm] = useState({
        type: "EXPENSE" as "INCOME" | "EXPENSE",
        amount: "",
        description: "",
        categoryId: "",
        date: "",
    });

    const summary: FinanceSummary | undefined = data?.summary;
    const transactions: Transaction[] = data?.transactions ?? [];
    const monthlyBudget = summary?.monthlyBudget ?? 0;
    const totalSpent = summary?.totalSpent ?? 0;
    const totalIncome = summary?.totalIncome ?? 0;
    const savings = summary?.savings ?? 0;
    const budgetRemaining = summary?.budgetRemaining ?? Math.max(monthlyBudget - totalSpent, 0);
    const savingsRate = summary?.savingsRate ?? 0;
    const categoryBreakdown = summary?.categoryBreakdown ?? [];
    const insight = summary?.insight ?? "No finance data yet — create a budget and add transactions.";
    const budgetPct = monthlyBudget > 0 ? Math.min((totalSpent / monthlyBudget) * 100, 100) : 0;

    function handleTxSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!txForm.amount || !txForm.description) return;
        createTx.mutate(
            {
                type: txForm.type,
                amount: parseFloat(txForm.amount),
                description: txForm.description,
                categoryId: txForm.categoryId || undefined,
                date: txForm.date || undefined,
            },
            {
                onSuccess: () => {
                    setTxOpen(false);
                    setTxForm({ type: "EXPENSE", amount: "", description: "", categoryId: "", date: "" });
                },
            }
        );
    }

    if (isLoading && !summary) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary" /> Finance
                    </h1>
                    <p className="text-muted-foreground mt-1">Track income, spending, savings, and budget health.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/app/finance/budget">
                            <TrendingUp className="mr-2 h-4 w-4" /> Budget
                        </Link>
                    </Button>
                    <Button onClick={() => setTxOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add transaction
                    </Button>
                </div>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-2 flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground">Total income</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold">{formatCurrency(totalIncome)}</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-2 flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground">Total spent</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold">{formatCurrency(totalSpent)}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {monthlyBudget > 0 ? `${budgetPct.toFixed(0)}% of budget` : "No budget set"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-2 flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground">Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold">{formatCurrency(savings)}</p>
                        {totalIncome > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1">Rate: {savingsRate.toFixed(1)}%</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/20 transition-colors">
                    <CardHeader className="pb-2 flex items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground">Budget remaining</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold">{formatCurrency(budgetRemaining)}</p>
                        {monthlyBudget > 0 && (
                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, 100 - budgetPct)}%` }} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <motion.div variants={item} className="lg:col-span-2">
                    <Card className="hover:border-primary/20 transition-colors">
                        <CardHeader className="pb-3 flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Spending by category
                            </CardTitle>
                            <Badge variant="secondary" className="text-[11px]">{categoryBreakdown.length} categories</Badge>
                        </CardHeader>
                        <CardContent>
                            {categoryBreakdown.length === 0 ? (
                                <div className="text-center py-6 space-y-3">
                                    <p className="text-sm text-muted-foreground">No budget set yet.</p>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/app/finance/budget">Create budget →</Link>
                                    </Button>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[360px]">
                                    <div className="space-y-3 pt-1">
                                        {categoryBreakdown.map((cat) => {
                                            const pct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
                                            const over = cat.spent > cat.budget;
                                            return (
                                                <div key={cat.category} className="space-y-1 rounded-lg border border-border/60 bg-card/60 p-3">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>{cat.category}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}
                                                        </span>
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

                <motion.div variants={item} className="space-y-4">
                    <Card className="hover:border-primary/20 transition-colors">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Budget insight</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{insight}</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-primary/20 transition-colors">
                        <CardHeader className="pb-3 flex items-center justify-between">
                            <CardTitle className="text-base">Recent transactions</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setTxOpen(true)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {transactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No transactions yet.</p>
                            ) : (
                                <ScrollArea className="max-h-[240px]">
                                    <div className="space-y-2">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2 group">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{tx.description}</p>
                                                    <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <p className={`text-sm font-semibold ${tx.type === "expense" ? "text-destructive" : "text-emerald-500"}`}>
                                                        {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                                                    </p>
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                                                        onClick={() => deleteTx.mutate(tx.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <Dialog open={txOpen} onOpenChange={setTxOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Add transaction</DialogTitle></DialogHeader>
                    <form onSubmit={handleTxSubmit} className="space-y-4 pt-2">
                        <div className="flex gap-2">
                            {(["EXPENSE", "INCOME"] as const).map((t) => (
                                <Button key={t} type="button" variant={txForm.type === t ? "default" : "outline"} size="sm" className="flex-1"
                                    onClick={() => setTxForm((f) => ({ ...f, type: t }))}>
                                    {t === "INCOME" ? "Income" : "Expense"}
                                </Button>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <Label>Amount</Label>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" value={txForm.amount}
                                onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Input placeholder="What was this for?" value={txForm.description}
                                onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Category (optional)</Label>
                            <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                value={txForm.categoryId} onChange={(e) => setTxForm((f) => ({ ...f, categoryId: e.target.value }))}>
                                <option value="">No category</option>
                                {(categories as any[]).filter((c) => c.type === txForm.type).map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label>Date (optional)</Label>
                            <Input type="date" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setTxOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createTx.isPending}>{createTx.isPending ? "Saving..." : "Save"}</Button>
                        </div>

                        {createTx.error && (
                            <p className="text-xs text-center text-destructive">
                                {(createTx.error as Error).message}
                            </p>
                        )}
                    </form>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}