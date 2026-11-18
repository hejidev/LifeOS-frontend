"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, CheckCircle2, CheckSquare, Columns3, LayoutList, ListChecks, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { EmptyState, PageHeader, ProgressBar, Section, StatCard } from "@/components/app/kit";
import { useCreateTask, useFocusSuggestions, useTasks, useUpdateTaskStatus } from "@/lib/hooks/use-life-data";
import { cn, dueNoon } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types/life";

type GroupKey = "overdue" | "today" | "upcoming" | "nodate" | "done";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  P1: "border-destructive/40 bg-destructive/10 text-destructive",
  P2: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  P3: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  P4: "text-muted-foreground",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = { P1: "Critical", P2: "High", P3: "Normal", P4: "Low" };
const PRIORITY_BAR: Record<TaskPriority, "danger" | "warning" | "default" | "success"> = { P1: "danger", P2: "warning", P3: "default", P4: "success" };

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "nodate", label: "No date" },
  { key: "done", label: "Completed" },
];

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function daysFromToday(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
}

function groupOf(task: Task): GroupKey {
  if (task.status === "done") return "done";
  const diff = daysFromToday(task.dueDate);
  if (diff === null) return "nodate";
  if (diff < 0) return "overdue";
  return diff === 0 ? "today" : "upcoming";
}

function dueLabel(task: Task) {
  const diff = daysFromToday(task.dueDate);
  if (diff === null) return null;
  const time = task.dueTime ? ` · ${task.dueTime}` : "";
  if (task.status !== "done" && diff < 0) return { text: diff === -1 ? "Yesterday" : `${-diff} days overdue`, tone: "text-destructive" };
  if (diff === 0) return { text: `Today${time}`, tone: "text-primary" };
  if (diff === 1) return { text: `Tomorrow${time}`, tone: "" };
  const [year, month, day] = task.dueDate!.slice(0, 10).split("-").map(Number);
  return { text: `${format(new Date(year, month - 1, day), "EEE d MMM")}${time}`, tone: "" };
}

function compareTasks(a: Task, b: Task) {
  if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
  return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
    >
      {children}
    </button>
  );
}

function TaskRow({ task, onOpen, onToggle }: { task: Task; onOpen: () => void; onToggle: (done: boolean) => void }) {
  const due = dueLabel(task);
  const finished = task.subtasks.filter((subtask) => subtask.completed).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
      className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-colors hover:border-primary/40"
    >
      <Checkbox checked={task.status === "done"} onCheckedChange={(checked) => onToggle(!!checked)} onClick={(event) => event.stopPropagation()} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {due && <span className={cn("flex items-center gap-1", due.tone)}><CalendarDays className="h-3 w-3" /> {due.text}</span>}
          {task.subtasks.length > 0 && <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {finished}/{task.subtasks.length}</span>}
          {task.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5">{tag}</span>)}
        </div>
      </div>
      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[task.priority])}>{task.priority}</span>
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: tasks, isLoading } = useTasks();
  const { data: suggestions } = useFocusSuggestions();
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();

  const [view, setView] = useState<"list" | "board">("list");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "true");
  // const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [showAllDone, setShowAllDone] = useState(false);
  const [quick, setQuick] = useState({ title: "", due: "today" as "today" | "tomorrow" | "none" });

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id") ?? searchParams.get("highlight"));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (tasks ?? [])
      .filter((task) => (priority === "all" || task.priority === priority) && (status === "all" || task.status === status))
      .filter((task) => !needle || task.title.toLowerCase().includes(needle) || task.tags.some((tag) => tag.toLowerCase().includes(needle)))
      .sort(compareTasks);
  }, [tasks, query, priority, status]);

  const grouped = useMemo(() => {
    const result: Record<GroupKey, Task[]> = { overdue: [], today: [], upcoming: [], nodate: [], done: [] };
    filtered.forEach((task) => result[groupOf(task)].push(task));
    return result;
  }, [filtered]);

  const stats = useMemo(() => {
    const all = tasks ?? [];
    const open = all.filter((task) => task.status !== "done");
    return {
      total: all.length,
      open: open.length,
      today: open.filter((task) => daysFromToday(task.dueDate) === 0).length,
      overdue: open.filter((task) => (daysFromToday(task.dueDate) ?? 0) < 0).length,
      done: all.length - open.length,
      byPriority: (["P1", "P2", "P3", "P4"] as TaskPriority[]).map((key) => ({ key, count: open.filter((task) => task.priority === key).length })),
    };
  }, [tasks]);

  const selectedTask = (tasks ?? []).find((task) => task.id === selectedId) ?? null;

  function closeSheet() {
    setSelectedId(null);
    if (searchParams.get("id") || searchParams.get("highlight")) router.replace("/app/tasks");
  }

  function addQuick(event: React.FormEvent) {
    event.preventDefault();
    const title = quick.title.trim();
    if (!title || createTask.isPending) return;
    createTask.mutate(
      { title, priority: "P3", status: "todo", ...(quick.due === "none" ? {} : { dueDate: dueNoon(quick.due === "today" ? 0 : 1) }) },
      { onSuccess: () => setQuick((current) => ({ ...current, title: "" })) }
    );
  }

  function toggle(task: Task, done: boolean) {
    updateStatus.mutate({ id: task.id, status: done ? "done" : "todo" });
  }

  if (isLoading || !tasks) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CheckSquare}
        title="Tasks"
        subtitle={`${format(new Date(), "EEEE, d MMMM")} · ${stats.open} open`}
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New task</Button>}
      />

      <form onSubmit={addQuick} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <Input value={quick.title} onChange={(event) => setQuick((current) => ({ ...current, title: event.target.value }))} placeholder="Add a task and press Enter" className="h-10 min-w-[12rem] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0" maxLength={200} />
        <select value={quick.due} onChange={(event) => setQuick((current) => ({ ...current, due: event.target.value as typeof quick.due }))} className="h-10 rounded-lg border bg-background px-2 text-sm">
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="none">No date</option>
        </select>
        <Button type="submit" disabled={createTask.isPending || !quick.title.trim()}>Add</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={CheckSquare} label="Open" value={stats.open} hint={`${stats.total} in total`} />
        <StatCard icon={CalendarDays} label="Due today" value={stats.today} tone={stats.today > 0 ? "warning" : "default"} hint={stats.today > 0 ? "Plan these first" : "Nothing due"} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "danger" : "success"} hint={stats.overdue > 0 ? "Needs attention" : "All caught up"} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.done} progress={stats.total ? (stats.done / stats.total) * 100 : 0} tone="success" hint={stats.total ? `${Math.round((stats.done / stats.total) * 100)}% of all tasks` : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks or tags" className="h-9 pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "P1", "P2", "P3", "P4"] as const).map((key) => <Chip key={key} active={priority === key} onClick={() => setPriority(key)}>{key === "all" ? "All priorities" : key}</Chip>)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "todo", "in_progress", "done"] as const).map((key) => <Chip key={key} active={status === key} onClick={() => setStatus(key)}>{key === "all" ? "Any status" : key.replace("_", " ")}</Chip>)}
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as "list" | "board")} className="sm:ml-auto">
          <TabsList>
            <TabsTrigger value="list"><LayoutList className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="board"><Columns3 className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks match" body="Clear a filter or add a task with the bar above." />
          ) : view === "list" ? (
            GROUPS.map((group) => {
              const items = grouped[group.key];
              if (items.length === 0) return null;
              const visible = group.key === "done" && !showAllDone ? items.slice(0, 5) : items;
              return (
                <div key={group.key} className="space-y-2">
                  <p className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", group.key === "overdue" ? "text-destructive" : "text-muted-foreground")}>
                    {group.label}<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{items.length}</span>
                  </p>
                  {visible.map((task) => <TaskRow key={task.id} task={task} onOpen={() => setSelectedId(task.id)} onToggle={(done) => toggle(task, done)} />)}
                  {group.key === "done" && items.length > 5 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllDone((value) => !value)}>{showAllDone ? "Show fewer" : `Show all ${items.length}`}</Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {COLUMNS.map((column) => {
                const items = filtered.filter((task) => task.status === column.key);
                return (
                  <div key={column.key} className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.label}<span>{items.length}</span></p>
                    {items.map((task) => {
                      const due = dueLabel(task);
                      return (
                        <div key={task.id} role="button" tabIndex={0} onClick={() => setSelectedId(task.id)} onKeyDown={(event) => event.key === "Enter" && setSelectedId(task.id)} className="cursor-pointer space-y-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[task.priority])}>{task.priority}</span>
                            {due && <span className={cn("text-[11px] text-muted-foreground", due.tone)}>{due.text}</span>}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-full text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateStatus.mutate({ id: task.id, status: task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo" });
                            }}
                          >
                            {task.status === "todo" ? "Start" : task.status === "in_progress" ? "Mark done" : "Reopen"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Focus" icon={Sparkles} className="border-primary/20 bg-primary/5">
            {suggestions?.length ? (
              <div className="space-y-3">
                {suggestions.map((suggestion: { id: string; title: string; reason: string }, index: number) => (
                  <div key={suggestion.id} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No suggestions yet. Add due dates and priorities to unlock focus insights.</p>
            )}
          </Section>

          <Section title="Open by priority" icon={ListChecks}>
            {stats.open === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing open. Enjoy the quiet.</p>
            ) : (
              <div className="space-y-3">
                {stats.byPriority.map(({ key, count }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{key} · {PRIORITY_LABEL[key]}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <ProgressBar value={(count / stats.open) * 100} tone={PRIORITY_BAR[key]} />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TaskDetailSheet task={selectedTask} open={!!selectedTask} onClose={closeSheet} />
    </div>
  );
}