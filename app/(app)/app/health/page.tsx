"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Droplets, Dumbbell, Footprints, HeartPulse, Lightbulb, Moon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, Section, SectionLink, StatCard } from "@/components/app/kit";
import { useHealthSummary, useLogHealth } from "@/lib/hooks/use-health";
import { useToggleHabitCompletion } from "@/lib/hooks/use-habits";
import { cn } from "@/lib/utils";
import type { HealthDashboard, HealthDay, HealthInsight } from "@/types/health";

const INSIGHT_STYLE: Record<HealthInsight["tone"], string> = {
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  danger: "border-destructive/30 bg-destructive/5",
  info: "border-primary/20 bg-primary/5",
};

const percent = (value: number, goal: number) => Math.min(100, goal > 0 ? (value / goal) * 100 : 0);

function Trend({
  title,
  icon,
  days,
  pick,
  goal,
  average,
  format,
}: {
  title: string;
  icon: typeof Moon;
  days: HealthDay[];
  pick: (day: HealthDay) => number | null;
  goal: number;
  average: number | null;
  format: (value: number) => string;
}) {
  const values = days.map(pick);
  const max = Math.max(goal, ...values.map((value) => value ?? 0), 1);

  return (
    <Section title={title} icon={icon} action={average !== null ? <span className="text-xs text-muted-foreground">Avg {format(average)}</span> : undefined}>
      <div className="relative flex h-28 items-end gap-2">
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/40" style={{ bottom: `${(goal / max) * 100}%` }} />
        {days.map((day, index) => {
          const value = values[index];
          return (
            <div key={day.date} className="flex h-full flex-1 flex-col justify-end" title={`${day.label}: ${value === null ? "not logged" : format(value)}`}>
              <div
                className={cn("w-full rounded-t-md", value === null ? "bg-muted" : value >= goal ? "bg-emerald-500" : "bg-primary", index === days.length - 1 && "ring-1 ring-primary")}
                style={{ height: `${value === null ? 4 : Math.max(6, (value / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 text-[11px] text-muted-foreground">{days.map((day) => <span key={day.date} className="flex-1 text-center">{day.label.slice(0, 1)}</span>)}</div>
    </Section>
  );
}

function LogDialog({ data, onClose }: { data: HealthDashboard; onClose: () => void }) {
  const log = useLogHealth();
  const todayKey = data.date;
  const minKey = new Date(new Date(`${todayKey}T12:00:00Z`).getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  const toForm = (key: string) => {
    const row = data.week.find((day) => day.date === key);
    return {
      sleepHours: row?.sleepHours != null ? String(row.sleepHours) : "",
      steps: row?.steps != null ? String(row.steps) : "",
      waterGlasses: row?.waterGlasses != null ? String(row.waterGlasses) : "",
      workoutDone: row?.workoutDone ?? false,
    };
  };

  const [date, setDate] = useState(todayKey);
  const [form, setForm] = useState(() => toForm(todayKey));
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { date, workoutDone: form.workoutDone };
    const fields = [["sleepHours", form.sleepHours], ["steps", form.steps], ["waterGlasses", form.waterGlasses]] as const;
    let any = form.workoutDone;

    for (const [key, raw] of fields) {
      if (raw.trim() === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) return setError("Enter valid numbers.");
      payload[key] = value;
      any = true;
    }
    if (!any) return setError("Enter at least one value.");

    log.mutate(payload, { onSuccess: onClose, onError: (err: Error) => setError(err.message) });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log health</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={date} min={minKey} max={todayKey} onChange={(e) => { setDate(e.target.value); setForm(toForm(e.target.value)); }} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Sleep (hours)</Label>
              <Input type="number" inputMode="decimal" step="0.1" min="0" max="24" placeholder="7.5" value={form.sleepHours} onChange={(e) => setForm((f) => ({ ...f, sleepHours: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Steps</Label>
              <Input type="number" inputMode="numeric" min="0" max="100000" placeholder="8000" value={form.steps} onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Water (glasses)</Label>
              <Input type="number" inputMode="numeric" min="0" max="30" placeholder="6" value={form.waterGlasses} onChange={(e) => setForm((f) => ({ ...f, waterGlasses: e.target.value }))} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={form.workoutDone} onChange={(e) => setForm((f) => ({ ...f, workoutDone: e.target.checked }))} /> Workout done
            </label>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={log.isPending}>{log.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function HealthPage() {
  const { data, isLoading, isError, refetch } = useHealthSummary();
  const log = useLogHealth();
  const toggleHabit = useToggleHabitCompletion();
  const [dialogId, setDialogId] = useState<number | null>(null);

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your health data.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)}</div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  const { today, goals, week, averages } = data;
  const sleep = today.sleepHours ?? 0;
  const steps = today.steps ?? 0;
  const water = today.waterGlasses ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HeartPulse}
        title="Health"
        subtitle="Sleep, movement, hydration and habits in one place."
        actions={<Button onClick={() => setDialogId(Date.now())}><Plus className="mr-1.5 h-4 w-4" /> Log health</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Moon} label="Sleep" value={`${sleep} h`} progress={percent(sleep, goals.sleepHours)} tone={sleep >= goals.sleepHours ? "success" : "default"} hint={`Goal ${goals.sleepHours} h`} />
        <StatCard icon={Footprints} label="Steps" value={steps.toLocaleString()} progress={percent(steps, goals.steps)} tone={steps >= goals.steps ? "success" : "default"} hint={`Goal ${goals.steps.toLocaleString()}`} />
        <StatCard
          icon={Droplets}
          label="Water"
          value={`${water} / ${goals.waterGlasses}`}
          progress={percent(water, goals.waterGlasses)}
          tone={water >= goals.waterGlasses ? "success" : "default"}
          hint={
            <Button size="sm" variant="outline" className="mt-0.5 h-7 px-2 text-xs" disabled={log.isPending || water >= 30} onClick={() => log.mutate({ waterGlasses: water + 1 })}>
              <Plus className="mr-1 h-3 w-3" /> 1 glass
            </Button>
          }
        />
        <StatCard
          icon={Dumbbell}
          label="Workouts this week"
          value={`${data.workoutsThisWeek} / ${goals.workoutsPerWeek}`}
          progress={percent(data.workoutsThisWeek, goals.workoutsPerWeek)}
          tone={data.workoutsThisWeek >= goals.workoutsPerWeek ? "success" : "default"}
          hint={
            <Button size="sm" variant={today.workoutDone ? "default" : "outline"} className="mt-0.5 h-7 px-2 text-xs" disabled={log.isPending} onClick={() => log.mutate({ workoutDone: !today.workoutDone })}>
              {today.workoutDone ? "Done today" : "Mark today"}
            </Button>
          }
        />
      </div>

      {data.insights.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {data.insights.map((insight) => (
            <div key={insight.text} className={cn("flex items-start gap-3 rounded-xl border p-3", INSIGHT_STYLE[insight.tone])}>
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm">{insight.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Trend title="Sleep" icon={Moon} days={week} pick={(day) => day.sleepHours} goal={goals.sleepHours} average={averages.sleepHours} format={(value) => `${value.toFixed(1)} h`} />
        <Trend title="Steps" icon={Footprints} days={week} pick={(day) => day.steps} goal={goals.steps} average={averages.steps} format={(value) => Math.round(value).toLocaleString()} />
        <Trend title="Water" icon={Droplets} days={week} pick={(day) => day.waterGlasses} goal={goals.waterGlasses} average={averages.waterGlasses} format={(value) => `${value.toFixed(1)} glasses`} />
      </div>

      <Section title="Habits" icon={CheckCircle2} action={<SectionLink href="/app/habits">Manage</SectionLink>}>
        {data.habits.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No habits yet" body="Habits you create show up here for a quick daily check-off." action={<Button size="sm" variant="outline" asChild><Link href="/app/habits">Create a habit</Link></Button>} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data.habits.map((habit) => (
              <label key={habit.id} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 hover:border-primary/40">
                <Checkbox checked={habit.completedToday} onCheckedChange={() => toggleHabit.mutate({ id: habit.id })} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium", habit.completedToday && "text-muted-foreground line-through")}>{habit.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {habit.streak} {habit.frequency === "weekly" ? "week" : "day"} streak{habit.atRisk ? " · at risk" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {dialogId !== null && <LogDialog key={dialogId} data={data} onClose={() => setDialogId(null)} />}
    </div>
  );
}