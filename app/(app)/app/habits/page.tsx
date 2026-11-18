"use client";

import { useMemo, useState } from "react";
import { Archive, BookOpen, BrainCircuit, Check, Circle, Dumbbell, Flame, MoreVertical, Pencil, Plus, RotateCcw, Sparkles, Trash2, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, Section } from "@/components/app/kit";
import { useCreateHabit, useDeleteHabit, useHabitsList, useHabitSummary, useToggleHabitCompletion, useUpdateHabit } from "@/lib/hooks/use-habits";
import { cn } from "@/lib/utils";
import type { Habit, HabitCategory } from "@/types/life";

const CATEGORIES: Record<HabitCategory, { label: string; icon: typeof Circle; color: string }> = {
  health: { label: "Health", icon: Dumbbell, color: "#22c55e" },
  focus: { label: "Focus", icon: BrainCircuit, color: "#6366f1" },
  learning: { label: "Learning", icon: BookOpen, color: "#f59e0b" },
  finance: { label: "Finance", icon: Wallet, color: "#0ea5e9" },
  other: { label: "Other", icon: Circle, color: "#a1a1aa" },
};

const SWATCHES = ["#22c55e", "#6366f1", "#f59e0b", "#0ea5e9", "#ec4899", "#ef4444", "#14b8a6", "#a855f7"];

function Ring({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
      <circle cx="52" cy="52" r={radius} stroke="currentColor" strokeWidth="10" fill="none" className="text-muted" />
      <circle
        cx="52"
        cy="52"
        r={radius}
        stroke="currentColor"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        className="text-primary"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (percent / 100) * circumference}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function HabitCard({
  habit,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
}: {
  habit: Habit;
  onToggle: (date?: string) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORIES[habit.category] ?? CATEGORIES.other;
  const Icon = meta.icon;
  const color = habit.colorHex ?? meta.color;
  const weekly = habit.frequency === "weekly";
  const unit = weekly ? "week" : "day";
  const atRisk = !habit.completedToday && habit.streak > 0;

  return (
    <div className={cn("space-y-3 rounded-xl border bg-card p-4 transition-colors", habit.completedToday && "border-primary/40 bg-primary/5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{habit.title}</p>
            <p className="text-xs text-muted-foreground">{meta.label} · {weekly ? "weekly" : "daily"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Habit options"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {habit.description && <p className="line-clamp-2 text-xs text-muted-foreground">{habit.description}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <Flame className={cn("h-4 w-4", habit.streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            {habit.streak}
            <span className="text-xs font-normal text-muted-foreground">{unit} streak</span>
          </span>
          {atRisk && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">At risk</span>}
        </div>
        <Button size="sm" variant={habit.completedToday ? "default" : "outline"} className="h-8 gap-1.5" onClick={() => onToggle()}>
          <Check className="h-3.5 w-3.5" />
          {habit.completedToday ? "Done" : weekly ? "Done this week" : "Mark done"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
          {habit.last30Days.map((day, index) => {
            const daysBack = 29 - index;
            const editable = !weekly && daysBack <= 14;
            return (
              <button
                key={day.date}
                type="button"
                title={`${day.date}${editable ? " · tap to change" : ""}`}
                disabled={!editable}
                onClick={() => onToggle(day.date)}
                className={cn("aspect-square rounded-[3px] transition-opacity", !day.completed && "bg-muted", editable && "hover:opacity-70", !editable && "cursor-default")}
                style={day.completed ? { backgroundColor: color } : undefined}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Last 30 days</span>
          <span>{habit.consistency}% consistent{habit.longestStreak > habit.streak ? ` · best ${habit.longestStreak}` : ""}</span>
        </div>
      </div>
    </div>
  );
}

function HabitDialog({ editing, onClose }: { editing: Habit | null; onClose: () => void }) {
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    frequency: editing?.frequency ?? "daily",
    category: editing?.category ?? "other",
    colorHex: editing?.colorHex ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      category: form.category,
      ...(form.colorHex ? { colorHex: form.colorHex } : {}),
    };
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };
    if (editing) update.mutate({ id: editing.id, data: payload }, outcome);
    else create.mutate(payload, outcome);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit habit" : "New habit"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Drink 2 litres of water" maxLength={160} required autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Why it matters (optional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Repeats</Label>
              <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as "daily" | "weekly" }))}>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as HabitCategory }))}>
                {(Object.keys(CATEGORIES) as HabitCategory[]).map((key) => <option key={key} value={key}>{CATEGORIES[key].label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Colour ${swatch}`}
                  onClick={() => setForm((f) => ({ ...f, colorHex: f.colorHex === swatch ? "" : swatch }))}
                  className={cn("h-7 w-7 rounded-full border-2", form.colorHex === swatch ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending || !form.title.trim()}>{pending ? "Saving..." : editing ? "Save" : "Create habit"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function HabitsPage() {
  const { data, isLoading, isError, refetch } = useHabitSummary();
  const update = useUpdateHabit();
  const remove = useDeleteHabit();
  const toggle = useToggleHabitCompletion();

  const [category, setCategory] = useState<HabitCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<{ id: number; editing: Habit | null } | null>(null);
  const { data: everything } = useHabitsList(true, showArchived);

  const habits = data?.habits;
  const filtered = useMemo(() => (habits ?? []).filter((habit) => category === "all" || habit.category === category), [habits, category]);
  const archived = (everything ?? []).filter((habit) => habit.archived);

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your habits.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}</div>
      </div>
    );
  }

  const done = data.habits.filter((habit) => habit.completedToday).length;
  const maxDone = Math.max(...data.week.map((day) => day.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Flame}
        title="Habits"
        subtitle={`${data.habits.length} ${data.habits.length === 1 ? "habit" : "habits"} · build streaks that stick`}
        actions={<Button onClick={() => setDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> New habit</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <div className="relative shrink-0">
            <Ring percent={data.completionRateToday} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{data.completionRateToday}%</span>
              <span className="text-[10px] text-muted-foreground">today</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Today's progress</p>
            <p className="mt-1 text-xs text-muted-foreground">{done} of {data.habits.length} checked off</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5 text-orange-500" /> Best active streak {data.bestStreak} · all-time {data.bestEver}</p>
          </div>
        </div>

        <Section title="This week" icon={Flame}>
          {data.habits.every((habit) => habit.frequency === "weekly") ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Daily habits appear here.</p>
          ) : (
            <>
              <div className="flex h-20 items-end gap-2">
                {data.week.map((day, index) => (
                  <div key={day.date} className="flex h-full flex-1 flex-col justify-end" title={`${day.label}: ${day.done}/${day.total}`}>
                    <div
                      className={cn("w-full rounded-t-md", day.total > 0 && day.done === day.total ? "bg-emerald-500" : day.done > 0 ? "bg-primary" : "bg-muted", index === data.week.length - 1 && "ring-1 ring-primary")}
                      style={{ height: `${Math.max(day.done > 0 ? 8 : 4, (day.done / maxDone) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 text-[11px] text-muted-foreground">{data.week.map((day) => <span key={day.date} className="flex-1 text-center">{day.label.slice(0, 1)}</span>)}</div>
            </>
          )}
        </Section>

        <Section title="Insight" icon={Sparkles} className="border-primary/20 bg-primary/5">
          <p className="text-sm text-muted-foreground">{data.insight}</p>
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...Object.keys(CATEGORIES)] as (HabitCategory | "all")[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", category === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
          >
            {key === "all" ? "All" : CATEGORIES[key].label}
          </button>
        ))}
        <button type="button" onClick={() => setShowArchived((value) => !value)} className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline">
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Flame}
          title={data.habits.length === 0 ? "Start your first streak" : "No habits in this category"}
          body={data.habits.length === 0 ? "Pick one small thing you can do every day." : "Try another category."}
          action={data.habits.length === 0 ? <Button size="sm" onClick={() => setDialog({ id: Date.now(), editing: null })}>Create a habit</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={(date) => toggle.mutate({ id: habit.id, date })}
              onEdit={() => setDialog({ id: Date.now(), editing: habit })}
              onArchive={() => update.mutate({ id: habit.id, data: { archived: true } })}
              onDelete={() => window.confirm(`Delete "${habit.title}" and its history?`) && remove.mutate(habit.id)}
            />
          ))}
        </div>
      )}

      {showArchived && (
        <Section title={`Archived · ${archived.length}`} icon={Archive}>
          {archived.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing archived.</p>
          ) : (
            <div className="space-y-2">
              {archived.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <p className="truncate text-sm">{habit.title}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: habit.id, data: { archived: false } })}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => window.confirm(`Delete "${habit.title}" for good?`) && remove.mutate(habit.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {dialog && <HabitDialog key={dialog.id} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </div>
  );
}