"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Filter, LayoutList, Columns3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, useUpdateTaskStatus } from "@/lib/hooks/use-life-data";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import type { Task, TaskPriority, TaskStatus } from "@/types/life";
import { cn } from "@/lib/utils";

const priorityColors: Record<TaskPriority, string> = {
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

export function TasksContent() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTaskStatus();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "true");

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      const matchSearch = !filter || t.title.toLowerCase().includes(filter.toLowerCase());
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [tasks, filter, priorityFilter]);

  const selectedFromUrl = searchParams.get("id");
  const urlTask = tasks?.find((t) => t.id === selectedFromUrl);

  if (isLoading) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} tasks</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Filter tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "P1", "P2", "P3", "P4"] as const).map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter(p)}
            >
              {p === "all" ? "All" : p}
            </Button>
          ))}
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "board")} className="ml-auto">
          <TabsList>
            <TabsTrigger value="list"><LayoutList className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="board"><Columns3 className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "list" ? (
        <div className="space-y-2">
          {filtered.map((task, i) => (
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
                onCheckedChange={(checked) => {
                  updateTask.mutate({ id: task.id, status: checked ? "done" : "todo" });
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium", task.status === "done" && "line-through text-muted-foreground")}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}
                    </span>
                  )}
                  {task.suggestedSchedule && (
                    <Badge variant="secondary" className="text-[10px]">{task.suggestedSchedule}</Badge>
                  )}
                  {task.linkedNoteId && (
                    <Badge variant="outline" className="text-[10px]">Linked note</Badge>
                  )}
                </div>
              </div>
              <Badge className={cn("text-[10px] shrink-0", priorityColors[task.priority])}>
                {task.priority}
              </Badge>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusColumns.map((col) => (
            <div key={col.key} className="rounded-xl border border-border bg-card/50 p-4">
              <h3 className="font-medium text-sm mb-4 flex items-center justify-between">
                {col.label}
                <Badge variant="secondary" className="text-[10px]">
                  {filtered.filter((t) => t.status === col.key).length}
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
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge className={cn("text-[10px] mt-2", priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetailSheet
        task={selectedTask || urlTask || null}
        open={!!(selectedTask || urlTask)}
        onClose={() => setSelectedTask(null)}
      />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
