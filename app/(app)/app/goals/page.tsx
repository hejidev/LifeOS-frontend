"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const MODULES = ["TASKS", "FINANCE", "STUDY", "HEALTH", "CAREER", "OTHER"];
const emptyForm = { title: "", module: "OTHER", target: "", unit: "" };

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createGoal.mutate({ title: form.title, module: form.module, target: Number(form.target), unit: form.unit || undefined }, { onSuccess: () => { setOpen(false); setForm(emptyForm); } });
  }

  function adjustProgress(g: any, delta: number) {
    const next = Math.max(0, Math.min(g.target, g.progress + delta));
    updateGoal.mutate({ id: g.id, data: { progress: next, ...(next >= g.target ? { status: "COMPLETED" } : {}) } });
  }

  const active = (goals as any[]).filter((g) => g.status === "ACTIVE");
  const completed = (goals as any[]).filter((g) => g.status === "COMPLETED");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Goals</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track progress toward whatever matters to you.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New goal</Button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active goals yet.</p>
        ) : (
          active.map((g: any) => {
            const pct = Math.min(100, Math.round((g.progress / g.target) * 100));
            return (
              <Card key={g.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium">{g.title}</p><Badge variant="outline" className="text-[10px] mt-1">{g.module}</Badge></div>
                    <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => deleteGoal.mutate(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{g.progress}{g.unit ? ` ${g.unit}` : ""} of {g.target}{g.unit ? ` ${g.unit}` : ""}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => adjustProgress(g, -1)}>-1</Button><Button size="sm" variant="outline" onClick={() => adjustProgress(g, 1)}>+1</Button></div>
                </CardContent>
              </Card>
            );
          })
        )}
      </motion.div>

      {completed.length > 0 && (
        <motion.div variants={item} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</p>
          {completed.map((g: any) => (
            <Card key={g.id} className="opacity-70">
              <CardContent className="py-3 flex items-center justify-between">
                <p className="text-sm">{g.title}</p>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteGoal.mutate(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Save $500" required /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}>
                {MODULES.map((m) => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Target</Label><Input type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Unit (optional)</Label><Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="$, hrs, days" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={createGoal.isPending}>{createGoal.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}