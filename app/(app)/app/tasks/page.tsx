"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CheckSquare,
  Plus,
  Filter,
  LayoutList,
  Columns3,
  CalendarDays,
  Calendar,
  Flag,
  ArrowRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  useTasks,
  useUpdateTaskStatus,
  useCreateTask,
  useFocusSuggestions,
} from "@/lib/hooks/use-life-data";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import type { Task, TaskPriority, TaskStatus } from "@/types/life";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const priorityBadgeVariants = {
  P1: "destructive",
  P2: "warning",
  P3: "secondary",
  P4: "outline",
} as const;

const priorityChipClasses: Record<TaskPriority, string> = {
  P1: "bg-destructive/20 text-destructive border-destructive/30",
  P2: "bg-warning/20 text-warning border-warning/30",
  P3: "bg-secondary text-secondary-foreground",
  P4: "bg-muted text-muted-foreground",
};

const statusColumns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const { data: focusSuggestions } = useFocusSuggestions();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(
    searchParams.get("new") === "true"
  );

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    priority: "P2",
    status: "todo",
  });

  const today = new Date();

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      const matchSearch =
        !filter || t.title.toLowerCase().includes(filter.toLowerCase());
      const matchPriority =
        priorityFilter === "all" || t.priority === priorityFilter;
      const matchStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [tasks, filter, priorityFilter, statusFilter]);

  const selectedFromUrl = searchParams.get("id");
  const urlTask = tasks?.find((t) => t.id === selectedFromUrl);

  const p1Today = tasks?.filter(
    (t) => t.priority === "P1" && t.status !== "done"
  ) ?? [];

  const handleCreateInline = () => {
    if (!newTask.title?.trim()) return;
    createTask.mutate(
      {
        ...newTask,
        dueDate: newTask.dueDate || today.toISOString(),
      },
      {
        onSuccess: () => {
          setNewTask({ title: "", priority: "P2", status: "todo" });
          setCreateOpen(false);
        },
      }
    );
  };

  if (isLoading || !tasks) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Premium header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "EEEE, MMMM d, yyyy")} · {filtered.length} tasks ·
            Stay ahead of your priorities
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
      </motion.div>

      {/* Filters + view toggle */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
      >
        <Input
          placeholder="Filter tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "P1", "P2", "P3", "P4"] as const).map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter(p as TaskPriority | "all")}
            >
              {p === "all" ? "All" : p}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(["all", "todo", "in_progress", "done"] as const).map((s) => (
            <Badge
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              className="cursor-pointer text-xs capitalize"
              onClick={() => setStatusFilter(s as TaskStatus | "all")}
            >
              {s === "all" ? "All statuses" : s.replace("_", " ")}
            </Badge>
          ))}
        </div>
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "list" | "board")}
          className="sm:ml-auto"
        >
          <TabsList>
            <TabsTrigger value="list">
              <LayoutList className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="board">
              <Columns3 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Main grid: list/board + focus/AI suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List or board */}
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          {view === "list" ? (
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Task List
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tasks in this view. Create one to get started.
                  </p>
                ) : (
                  filtered.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <Checkbox
                        checked={task.status === "done"}
                        onCheckedChange={(checked) =>
                          updateTask.mutate({
                            id: task.id,
                            status: checked ? "done" : "todo",
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium",
                            task.status === "done" &&
                              "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {task.dueDate}
                              {task.dueTime ? ` ${task.dueTime}` : ""}
                            </span>
                          )}
                          {task.suggestedSchedule && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {task.suggestedSchedule}
                            </Badge>
                          )}
                          {task.linkedNoteId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] h-6 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to notes page with id, adjust route as needed
                                window.location.href = `/notes?id=${task.linkedNoteId}`;
                              }}
                            >
                              View linked note
                            </Button>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] shrink-0",
                          priorityChipClasses[task.priority]
                        )}
                      >
                        {task.priority}
                      </Badge>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Board View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {statusColumns.map((col) => (
                    <div
                      key={col.key}
                      className="rounded-xl border border-border bg-card/50 p-4"
                    >
                      <h3 className="font-medium text-sm mb-4 flex items-center justify-between">
                        {col.label}
                        <Badge variant="secondary" className="text-[10px]">
                          {
                            filtered.filter((t) => t.status === col.key)
                              .length
                          }
                        </Badge>
                      </h3>
                      <div className="space-y-2">
                        {filtered
                          .filter((t) => t.status === col.key)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/20 transition-colors"
                              onClick={() => setSelectedTask(task)}
                            >
                              <p className="text-sm font-medium">
                                {task.title}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    priorityChipClasses[task.priority]
                                  )}
                                >
                                  {task.priority}
                                </Badge>
                                {task.linkedNoteId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `/notes?id=${task.linkedNoteId}`;
                                    }}
                                  >
                                    View note
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Focus / AI suggestions */}
        <motion.div variants={item} className="space-y-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" /> Today&apos;s Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {p1Today.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No P1 tasks today. Great time for deep work or learning.
                </p>
              ) : (
                p1Today.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg p-2 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.suggestedSchedule ||
                        "Schedule this into your calendar to guarantee progress."}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" /> AI Focus
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {focusSuggestions?.length ? (
                focusSuggestions.map((s: { id: string; title: string; reason: string }, i: number) => (
                  <div key={s.id} className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {s.reason}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No suggestions yet. Add tasks with priorities and due dates to
                  unlock focus insights.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Inline create dialog (premium) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Task title"
              value={newTask.title ?? ""}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, title: e.target.value }))
              }
            />
            <Textarea
              placeholder="Optional description"
              value={newTask.description ?? ""}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, description: e.target.value }))
              }
            />
            <div className="flex gap-3">
              <Select
                value={newTask.priority ?? "P2"}
                onValueChange={(val) =>
                  setNewTask((t) => ({
                    ...t,
                    priority: val as Task["priority"],
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 · Critical</SelectItem>
                  <SelectItem value="P2">P2 · High</SelectItem>
                  <SelectItem value="P3">P3 · Normal</SelectItem>
                  <SelectItem value="P4">P4 · Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateInline}
                disabled={createTask.isPending}
              >
                {createTask.isPending ? "Creating..." : "Create task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail sheet + full create dialog */}
      <TaskDetailSheet
        task={selectedTask || urlTask || null}
        open={!!(selectedTask || urlTask)}
        onClose={() => setSelectedTask(null)}
      />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </motion.div>
  );
}