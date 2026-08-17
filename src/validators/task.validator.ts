import { z } from "zod";

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
    dueDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    tags: z.array(z.string()).default([]),
    linkedNoteId: z.string().uuid().optional(),
    recurring: z.boolean().default(false),
    smartReminder: z.boolean().default(false),
    subtasks: z.array(z.object({ title: z.string().min(1) })).default([]),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    recurring: z.boolean().optional(),
    smartReminder: z.boolean().optional(),
    suggestedSchedule: z.string().optional(),
  }),
});

export const updateSubtaskSchema = z.object({
  body: z.object({
    completed: z.boolean(),
  }),
});