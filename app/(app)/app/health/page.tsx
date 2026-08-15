"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse, Moon, Footprints, Droplets,
  Dumbbell, Sparkles, CheckCircle2, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useHealthSummary, useLogHealth, useCompleteHabit, useCreateHabit,
} from "@/lib/hooks/use-life-data";
import type { HealthSummary } from "@/types/life";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function HealthPage() {
  const { data, isLoading } = useHealthSummary();
  const logHealth = useLogHealth();
  const completeHabit = useCompleteHabit();
  const createHabit = useCreateHabit();

  const [logOpen, setLogOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    sleepHours: "", steps: "", waterGlasses: "", workoutDone: false,
  });
  const [habitForm, setHabitForm] = useState({ title: "", category: "" });

  const summary: HealthSummary = data ?? {
    sleepHours: 0, steps: 0, waterGlasses: 0, workoutsThisWeek: 0,
    insight: "No data yet — log your first entry below.",
    metrics: [], habits: [],
  };

  function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    logHealth.mutate({
      sleepHours: logForm.sleepHours ? parseFloat(logForm.sleepHours) : undefined,
      steps: logForm.steps ? parseInt(logForm.steps) : undefined,
      waterGlasses: logForm.waterGlasses ? parseInt(logForm.waterGlasses) : undefined,
      workoutDone: logForm.workoutDone,
    }, {
      onSuccess: () => {
        setLogOpen(false);
        setLogForm({ sleepHours: "", steps: "", waterGlasses: "", workoutDone: false });
      },
    });
  }

  function handleHabitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!habitForm.title.trim()) return;
    createHabit.mutate(
      { title: habitForm.title, category: habitForm.category || undefined },
      { onSuccess: () => { setHabitOpen(false); setHabitForm({ title: "", category: "" }); } }
    );
  }

  if (isLoading) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-primary" /> Health
          </h1>
          <p className="text-muted-foreground mt-1">Track sleep, activity, hydration, and habits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHabitOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add habit
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log today
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Sleep", value: `${summary.sleepHours} h`, icon: Moon },
          { label: "Steps", value: summary.steps.toLocaleString(), icon: Footprints },
          { label: "Water", value: `${summary.waterGlasses} glasses`, icon: Droplets },
          { label: "Workouts", value: `${summary.workoutsThisWeek} / week`, icon: Dumbbell },
        ].map((stat) => (
          <Card key={stat.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4" /> Wellness metrics
              </CardTitle>
              <Badge variant="secondary" className="text-[11px]">{summary.metrics.length} metrics</Badge>
            </CardHeader>
            <CardContent>
              {summary.metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No data yet. Click &quot;Log today&quot; to add your first entry.
                </p>
              ) : (
                <ScrollArea className="max-h-[360px]">
                  <div className="space-y-3 pt-1">
                    {summary.metrics.map((m) => {
                      const trendConfig = {
                        up: { label: "On target", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                        down: { label: "Needs attention", className: "bg-destructive/15 text-destructive border-destructive/30" },
                        stable: { label: "Stable", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
                      }[m.trend ?? "stable"];

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.value}{m.target ? ` · target ${m.target}` : ""}
                            </p>
                          </div>
                          {m.trend && (
                            <span className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full border font-medium ${trendConfig.className}`}>
                              {trendConfig.label}
                            </span>
                          )}
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
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.habits.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No habits yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setHabitOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add first habit
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.habits.map((habit) => (
                    <div key={habit.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{habit.title}</p>
                        <p className="text-xs text-muted-foreground">Streak: {habit.streak} days</p>
                      </div>
                      {habit.completedToday ? (
                        <Badge variant="secondary" className="text-[10px]">Done</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 px-2"
                          disabled={completeHabit.isPending}
                          onClick={() => completeHabit.mutate(habit.id)}
                        >
                          Mark done
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{summary.insight}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log today&apos;s health</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sleep">Sleep (hours)</Label>
                <Input
                  id="sleep"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  placeholder="7.5"
                  value={logForm.sleepHours}
                  onChange={(e) => setLogForm((f) => ({ ...f, sleepHours: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="steps">Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  min="0"
                  placeholder="8000"
                  value={logForm.steps}
                  onChange={(e) => setLogForm((f) => ({ ...f, steps: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="water">Water (glasses)</Label>
                <Input
                  id="water"
                  type="number"
                  min="0"
                  placeholder="6"
                  value={logForm.waterGlasses}
                  onChange={(e) => setLogForm((f) => ({ ...f, waterGlasses: e.target.value }))}
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logForm.workoutDone}
                    onChange={(e) => setLogForm((f) => ({ ...f, workoutDone: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Workout done</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={logHealth.isPending}>
                {logHealth.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add habit dialog */}
      <Dialog open={habitOpen} onOpenChange={setHabitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleHabitSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="habit-title">Habit name</Label>
              <Input
                id="habit-title"
                placeholder="Morning walk"
                value={habitForm.title}
                onChange={(e) => setHabitForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="habit-category">Category (optional)</Label>
              <select
                id="habit-category"
                value={habitForm.category}
                onChange={(e) => setHabitForm((f) => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                <option value="health">Health</option>
                <option value="focus">Focus</option>
                <option value="learning">Learning</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setHabitOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createHabit.isPending}>
                {createHabit.isPending ? "Adding..." : "Add habit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}