"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, ProgressBar, Section, StatCard } from "@/components/app/kit";
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from "@/lib/hooks/use-goals";
import type { GoalModule, LifeGoal } from "@/lib/hooks/use-goals";
import { cn } from "@/lib/utils";

const MODULES: { key: GoalModule; label: string }[] = [
  { key: "TASKS", label: "Tasks" }, { key: "FINANCE", label: "Finance" }, { key: "STUDY", label: "Study" },
  { key: "HEALTH", label: "Health" }, { key: "CAREER", label: "Career" }, { key: "OTHER", label: "Other" },
];
const LABEL = Object.fromEntries(MODULES.map((item) => [item.key, item.label])) as Record<GoalModule, string>;
const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

const figure = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const percent = (goal: LifeGoal) => Math.min(100, Math.round((goal.progress / goal.target) * 100));

function deadlineText(goal: LifeGoal) {
  if (!goal.deadline) return null;
  const [year, month, day] = goal.deadline.slice(0, 10).split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const label = target.toLocaleDateString(undefined, { dateStyle: "medium" });

  if (goal.status !== "ACTIVE") return { text: label, tone: "text-muted-foreground" };
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} overdue`, tone: "text-destructive" };
  if (days === 0) return { text: "Due today", tone: "text-amber-600" };
  if (days <= 14) return { text: `Due in ${days} ${days === 1 ? "day" : "days"}`, tone: "text-amber-600" };
  return { text: label, tone: "text-muted-foreground" };
}

function GoalDialog({ editing, onClose }: { editing: LifeGoal | null; onClose: () => void }) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    module: editing?.module ?? ("OTHER" as GoalModule),
    target: editing ? String(editing.target) : "",
    progress: editing ? String(editing.progress) : "",
    unit: editing?.unit ?? "",
    deadline: editing?.deadline?.slice(0, 10) ?? "",
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const target = Number(form.target.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return setError("Enter a target above zero.");
    const progress = form.progress.trim() === "" ? undefined : Number(form.progress.replace(/,/g, ""));
    if (progress !== undefined && (!Number.isFinite(progress) || progress < 0)) return setError("Progress can't be negative.");

    const deadline = form.deadline ? `${form.deadline}T12:00:00.000Z` : null;
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };

    if (editing) {
      update.mutate({ id: editing.id, data: { title: form.title.trim(), module: form.module, target, progress, unit: form.unit.trim() || null, deadline } }, outcome);
    } else {
      create.mutate({ title: form.title.trim(), module: form.module, target, ...(progress !== undefined ? { progress } : {}), ...(form.unit.trim() ? { unit: form.unit.trim() } : {}), ...(deadline ? { deadline } : {}) }, outcome);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1"><Label>Goal</Label><Input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} placeholder="e.g. Save ₦500,000" maxLength={150} required autoFocus /></div>
          <div className="space-y-1"><Label>Category</Label><select className={select} value={form.module} onChange={(event) => setForm((f) => ({ ...f, module: event.target.value as GoalModule }))}>{MODULES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Target</Label><Input inputMode="decimal" value={form.target} onChange={(event) => setForm((f) => ({ ...f, target: event.target.value }))} required /></div>
            <div className="space-y-1"><Label>Unit (optional)</Label><Input value={form.unit} onChange={(event) => setForm((f) => ({ ...f, unit: event.target.value }))} placeholder="₦, km, books" maxLength={20} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{editing ? "Progress" : "Already done"}</Label><Input inputMode="decimal" value={form.progress} onChange={(event) => setForm((f) => ({ ...f, progress: event.target.value }))} placeholder="0" /></div>
            <div className="space-y-1"><Label>Deadline (optional)</Label><Input type="date" value={form.deadline} onChange={(event) => setForm((f) => ({ ...f, deadline: event.target.value }))} /></div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending || !form.title.trim()}>{create.isPending || update.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal, onEdit }: { goal: LifeGoal; onEdit: () => void }) {
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const due = deadlineText(goal);
  const active = goal.status === "ACTIVE";
  const unit = goal.unit ? ` ${goal.unit}` : "";
  const tenth = Math.max(goal.target / 10, 0);

  function log(delta: number) {
    setError(null);
    update.mutate({ id: goal.id, data: { progress: Math.max(0, goal.progress + delta) } }, { onError: (err: Error) => setError(err.message) });
  }

  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4", goal.overdue && "border-destructive/40", !active && "opacity-80")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", goal.status === "COMPLETED" && "line-through")}>{goal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{LABEL[goal.module]}{due ? <span className={cn("ml-2", due.tone)}>{due.text}</span> : null}{goal.status === "ABANDONED" ? <span className="ml-2">Dropped</span> : null}</p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit goal" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete goal" onClick={() => window.confirm(`Delete the goal "${goal.title}"?`) && remove.mutate(goal.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <ProgressBar value={percent(goal)} tone={goal.status === "COMPLETED" ? "success" : goal.overdue ? "danger" : "default"} />
        <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{figure(goal.progress)}{unit} of {figure(goal.target)}{unit}</span>
          <span>{percent(goal)}%</span>
        </div>
      </div>

      {active ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(amount.replace(/,/g, ""));
            if (!Number.isFinite(value) || value === 0) return setError("Enter an amount to add.");
            log(value);
            setAmount("");
          }}
        >
          <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Add progress" className="h-8 w-32" />
          <Button type="submit" size="sm" variant="outline" className="h-8" disabled={update.isPending}>Add</Button>
          <Button type="button" size="sm" variant="outline" className="h-8" disabled={update.isPending} onClick={() => log(tenth)}>+10%</Button>
          <Button type="button" size="sm" className="h-8" disabled={update.isPending} onClick={() => update.mutate({ id: goal.id, data: { status: "COMPLETED" } })}><Check className="mr-1 h-3.5 w-3.5" /> Done</Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-muted-foreground" disabled={update.isPending} onClick={() => update.mutate({ id: goal.id, data: { status: "ABANDONED" } })}>Drop</Button>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="h-8" disabled={update.isPending} onClick={() => update.mutate({ id: goal.id, data: { status: "ACTIVE" } })}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen</Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function GoalsPage() {
  const { data: goals, isLoading, isError, refetch } = useGoals();
  const [moduleFilter, setModuleFilter] = useState<GoalModule | "all">("all");
  const [showClosed, setShowClosed] = useState(false);
  const [dialog, setDialog] = useState<{ id: number; editing: LifeGoal | null } | null>(null);

  const { active, closed, stats } = useMemo(() => {
    const list = (goals ?? []).filter((goal) => moduleFilter === "all" || goal.module === moduleFilter);
    const open = list.filter((goal) => goal.status === "ACTIVE").sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    const all = goals ?? [];
    const running = all.filter((goal) => goal.status === "ACTIVE");
    return {
      active: open,
      closed: list.filter((goal) => goal.status !== "ACTIVE"),
      stats: {
        active: running.length,
        completed: all.filter((goal) => goal.status === "COMPLETED").length,
        overdue: running.filter((goal) => goal.overdue).length,
        average: running.length ? Math.round(running.reduce((sum, goal) => sum + Math.min(100, (goal.progress / goal.target) * 100), 0) / running.length) : 0,
      },
    };
  }, [goals, moduleFilter]);

  if (isError && !goals) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your goals.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !goals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const chip = (selected: boolean) => cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", selected ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted");

  return (
    <div className="space-y-6">
      <PageHeader icon={Target} title="Goals" subtitle="Track progress toward what matters to you." actions={<Button onClick={() => setDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> New goal</Button>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Target} label="Active" value={stats.active} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} tone="success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "danger" : "success"} hint={stats.overdue > 0 ? "Move the date or finish it" : "On schedule"} />
        <StatCard icon={Target} label="Average progress" value={`${stats.average}%`} progress={stats.average} />
      </div>

      {goals.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" className={chip(moduleFilter === "all")} onClick={() => setModuleFilter("all")}>All</button>
          {MODULES.filter((item) => goals.some((goal) => goal.module === item.key)).map((item) => <button key={item.key} type="button" className={chip(moduleFilter === item.key)} onClick={() => setModuleFilter(item.key)}>{item.label}</button>)}
        </div>
      )}

      {goals.length === 0 ? (
        <Section title="Goals" icon={Target}>
          <EmptyState icon={Target} title="Set your first goal" body="Save an amount, finish a course, run a distance. Give it a target and log progress as you go." action={<Button size="sm" onClick={() => setDialog({ id: Date.now(), editing: null })}>Add a goal</Button>} />
        </Section>
      ) : (
        <div className="space-y-4">
          {active.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No active goals here.</p> : <div className="grid gap-3 md:grid-cols-2">{active.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={() => setDialog({ id: Date.now(), editing: goal })} />)}</div>}
          {closed.length > 0 && (
            <>
              <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowClosed((value) => !value)}>{showClosed ? "Hide" : "Show"} {closed.length} completed or dropped</button>
              {showClosed && <div className="grid gap-3 md:grid-cols-2">{closed.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={() => setDialog({ id: Date.now(), editing: goal })} />)}</div>}
            </>
          )}
        </div>
      )}

      {dialog && <GoalDialog key={dialog.id} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </div>
  );
}