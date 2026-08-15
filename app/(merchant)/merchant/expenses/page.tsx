"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessExpenses, useCreateExpense, useDeleteExpense } from "@/lib/hooks/use-life-data";

const CATEGORIES = ["INVENTORY", "RENT", "UTILITIES", "SALARY", "MARKETING", "SUPPLIES", "OTHER"];

export default function ExpensesPage() {
  const { data: expenses = [] } = useBusinessExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "OTHER", amount: "", note: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createExpense.mutate(
      { title: form.title, category: form.category, amount: parseFloat(form.amount), note: form.note || undefined },
      { onSuccess: () => { setOpen(false); setForm({ title: "", category: "OTHER", amount: "", note: "" }); } }
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 sm:space-y-6 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> Expenses
        </h1>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add expense</Button>
      </div>

      <div className="space-y-2">
        {(expenses as any[]).map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.title}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{e.category}</Badge>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <p className="text-sm font-semibold">${e.amount}</p>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteExpense.mutate(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {expenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No expenses yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></div>
            <Button type="submit" className="w-full" disabled={createExpense.isPending}>{createExpense.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}