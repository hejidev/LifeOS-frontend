"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt, Plus, Trash2, Search, X, RotateCcw, DollarSign,
  Calendar, TrendingDown, Building2, Zap, Package, Truck,
  Wrench, FileText, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useBusinessExpenses, useCreateExpense, useDeleteExpense } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CATEGORIES = [
  { value: "INVENTORY", label: "Inventory", icon: Package, color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { value: "RENT", label: "Rent", icon: Building2, color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  { value: "UTILITIES", label: "Utilities", icon: Zap, color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { value: "SALARY", label: "Salary", icon: TrendingDown, color: "bg-green-500/10 text-green-700 border-green-500/30" },
  { value: "MARKETING", label: "Marketing", icon: FileText, color: "bg-pink-500/10 text-pink-700 border-pink-500/30" },
  { value: "SUPPLIES", label: "Supplies", icon: Wrench, color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30" },
  { value: "SHIPPING", label: "Shipping", icon: Truck, color: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  { value: "OTHER", label: "Other", icon: Receipt, color: "bg-slate-500/10 text-slate-700 border-slate-500/30" },
];

export default function ExpensesPage() {
  const { data: expenses = [] } = useBusinessExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "OTHER", amount: "", note: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createExpense.mutate(
      { title: form.title, category: form.category, amount: parseFloat(form.amount), note: form.note || undefined },
      { onSuccess: () => { setOpen(false); setForm({ title: "", category: "OTHER", amount: "", note: "" }); } }
    );
  }

  const filteredExpenses = (expenses as any[]).filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const currency = "NGN";
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Track and manage business expenses</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 h-9 sm:h-10 text-sm">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Expense Log</CardTitle>
              {(searchQuery || categoryFilter !== "ALL") && (
                <Button size="sm" variant="ghost" onClick={() => { setSearchQuery(""); setCategoryFilter("ALL"); }} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-sm">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <c.icon className="h-4 w-4" />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!expenses || expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No expenses logged yet.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Log your first expense
                </Button>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No expenses match your filters</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs sm:text-sm text-muted-foreground">Total filtered expenses</span>
                  <span className="text-base sm:text-lg font-bold text-destructive">{currency} {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="space-y-3">
                  {filteredExpenses.map((e: any) => {
                    const catInfo = getCategoryInfo(e.category);
                    const CategoryIcon = catInfo.icon;
                    return (
                      <Card key={e.id} className="group hover:border-primary/40 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors shrink-0">
                              <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs sm:text-sm font-semibold truncate">{e.title}</p>
                                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border shrink-0", catInfo.color)}>
                                  {catInfo.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(e.date).toLocaleDateString()}
                                </span>
                                {e.note && (
                                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{e.note}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-sm sm:text-lg font-bold text-destructive">{currency} {e.amount.toLocaleString()}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Delete "${e.title}"?`)) {
                                  deleteExpense.mutate(e.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Expense Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Office supplies"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <c.icon className="h-4 w-4" />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="pl-9 h-9 sm:h-10 text-sm"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Note (optional)</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Additional details..."
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <Button type="submit" className="w-full h-9 sm:h-11 text-sm" disabled={createExpense.isPending}>
              {createExpense.isPending ? (
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Log Expense"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}