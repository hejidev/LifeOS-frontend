"use client";

import type { Task } from "@/types/life";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useUpdateTaskStatus, useUpdateSubtask, useDeleteTask } from "@/lib/hooks/use-life-data";
import Link from "next/link";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailSheet({ task, open, onClose }: TaskDetailSheetProps) {
  const updateStatus = useUpdateTaskStatus();
  const updateSubtask = useUpdateSubtask();
  const deleteTask = useDeleteTask();

  if (!task) return null;

  function handleDelete() {
    deleteTask.mutate(task!.id, { onSuccess: onClose });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{task.priority}</Badge>
            <Badge variant="outline">{task.status.replace("_", " ")}</Badge>
            {task.recurring && <Badge variant="secondary">Recurring</Badge>}
            {task.smartReminder && <Badge variant="secondary">Smart reminder</Badge>}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          {task.suggestedSchedule && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm">
              <span className="text-primary font-medium">AI Suggested: </span>
              {task.suggestedSchedule}
            </div>
          )}

          {task.dueDate && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due date</p>
              <p className="text-sm">{task.dueDate}{task.dueTime ? ` at ${task.dueTime}` : ""}</p>
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Subtasks</p>
              <div className="space-y-2">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={st.completed}
                      onCheckedChange={(checked) =>
                        updateSubtask.mutate({
                          taskId: task.id,
                          subtaskId: st.id,
                          completed: !!checked,
                        })
                      }
                    />
                    <span className={st.completed ? "line-through text-muted-foreground text-sm" : "text-sm"}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.linkedNoteId && (
            <>
              <Separator />
              <Link href={`/app/notes?id=${task.linkedNoteId}`} className="text-sm text-primary hover:underline">
                View linked note →
              </Link>
            </>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            {task.status !== "done" && (
              <Button
                size="sm"
                onClick={() => {
                  updateStatus.mutate({ id: task.id, status: "done" });
                  onClose();
                }}
                disabled={updateStatus.isPending}
              >
                Mark complete
              </Button>
            )}
            {task.status === "done" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus.mutate({ id: task.id, status: "todo" })}
                disabled={updateStatus.isPending}
              >
                Reopen
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}