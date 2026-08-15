"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Plus,
  Sparkles,
  Trophy,
  Trash2,
  MoreVertical,
  Check,
  Dumbbell,
  BrainCircuit,
  BookOpen,
  Wallet,
  Circle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  useHabitSummary,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useToggleHabitCompletion,
} from "@/lib/hooks/use-life-data";
import type { Habit, HabitCategory } from "@/types/life";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const categoryMeta: Record<HabitCategory, { label: string; icon: any; color: string }> = {
  health: { label: "Health", icon: Dumbbell, color: "#22c55e" },
  focus: { label: "Focus", icon: BrainCircuit, color: "#6366f1" },
  learning: { label: "Learning", icon: BookOpen, color: "#f59e0b" },
  finance: { label: "Finance", icon: Wallet, color: "#0ea5e9" },
  other: { label: "Other", icon: Circle, color: "#a1a1aa" },
};

function CompletionRing({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
      <circle cx="52" cy="52" r={r} stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/30" />
      <motion.circle
        cx="52"
        cy="52"
        r={r}
        stroke="currentColor"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        className="text-primary"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

function Heatmap({ days }: { days: Habit["last30Days"] }) {
  return (
    <div className="grid grid-cols-10 gap-[3px]">
      {days.map((d) => (
        <div
          key={d.date}
          title={d.date}
          className={cn(
            "h-2.5 w-2.5 rounded-sm",
            d.completed ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function HabitCard({
  habit,
  onToggle,
  onDelete,
  onArchive,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const meta = categoryMeta[habit.category];
  const Icon = meta.icon;
  const atRisk = !habit.completedToday && habit.streak > 0;

  return (
    <motion.div variants={item} layout>
      <Card
        className={cn(
          "hover:border-primary/20 transition-colors relative overflow-hidden",
          habit.completedToday && "border-primary/40 bg-primary/5"
        )}
      >
        {atRisk && (
          <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden">
            <div className="absolute -right-8 top-2 w-24 rotate-45 bg-warning/80 text-center text-[9px] font-medium text-warning-foreground py-0.5">
              At risk
            </div>
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${habit.colorHex ?? meta.color}22`, color: habit.colorHex ?? meta.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{habit.title}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {meta.label} · {habit.frequency}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onArchive(habit.id)}>Archive</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(habit.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Flame className={cn("h-4 w-4", habit.streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
                {habit.streak}
                <span className="text-[11px] font-normal text-muted-foreground">day streak</span>
              </div>
              {habit.longestStreak > habit.streak && (
                <span className="text-[11px] text-muted-foreground">best {habit.longestStreak}</span>
              )}
            </div>
            <Button
              size="sm"
              variant={habit.completedToday ? "default" : "outline"}
              className="h-7 gap-1 text-xs"
              onClick={() => onToggle(habit.id)}
            >
              <Check className="h-3 w-3" />
              {habit.completedToday ? "Done" : "Mark done"}
            </Button>
          </div>

          <Heatmap days={habit.last30Days} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function HabitsPage() {
  const { data, isLoading } = useHabitSummary();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleCompletion = useToggleHabitCompletion();

  const [categoryFilter, setCategoryFilter] = useState<HabitCategory | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    frequency: "daily" as "daily" | "weekly",
    category: "other" as HabitCategory,
  });

  const habits = data?.habits ?? [];
  const filtered = useMemo(
    () => (categoryFilter === "all" ? habits : habits.filter((h) => h.category === categoryFilter)),
    [habits, categoryFilter]
  );

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createHabit.mutate(form, {
      onSuccess: () => {
        setForm({ title: "", description: "", frequency: "daily", category: "other" });
        setCreateOpen(false);
      },
    });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            Habits
          </h1>
          <p className="text-muted-foreground mt-1">
            {habits.length} habit{habits.length === 1 ? "" : "s"} tracked · build streaks that stick
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New habit
        </Button>
      </motion.div>

      {/* Hero: completion ring + best streak + insight */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="relative shrink-0 text-primary">
              <CompletionRing percent={data.completionRateToday} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{data.completionRateToday}%</span>
                <span className="text-[10px] text-muted-foreground">today</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Today&apos;s completion</p>
              <p className="text-xs text-muted-foreground mt-1">
                {habits.filter((h) => h.completedToday).length} of {habits.length} habits checked off
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-medium">Best active streak</p>
              <p className="text-2xl font-bold mt-0.5">{data.bestStreak} days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{data.insight}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category filter */}
      <motion.div variants={item} className="flex flex-wrap items-center gap-2">
        <Badge
          variant={categoryFilter === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setCategoryFilter("all")}
        >
          All
        </Badge>
        {(Object.keys(categoryMeta) as HabitCategory[]).map((cat) => {
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          return (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className="cursor-pointer gap-1"
              onClick={() => setCategoryFilter(cat)}
            >
              <Icon className="h-3 w-3" /> {meta.label}
            </Badge>
          );
        })}
      </motion.div>

      {/* Habit grid */}
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div variants={item} className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No habits in this category yet. Create one to start a streak.
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={(id) => toggleCompletion.mutate(id)}
                onDelete={(id) => deleteHabit.mutate(id)}
                onArchive={(id) => updateHabit.mutate({ id, data: { archived: true } })}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="e.g. Drink 2L of water"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                placeholder="Why this habit matters"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as "daily" | "weekly" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as HabitCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoryMeta) as HabitCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryMeta[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createHabit.isPending}>
                {createHabit.isPending ? "Creating..." : "Create habit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
