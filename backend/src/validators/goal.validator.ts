import { z } from "zod";

export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    module: z.enum(["TASKS", "FINANCE", "STUDY", "HEALTH", "CAREER", "OTHER"]).optional(),
    target: z.number().positive(),
    unit: z.string().max(20).optional(),
    deadline: z.string().datetime().optional(),
  }),
});

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    progress: z.number().min(0).optional(),
    target: z.number().positive().optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
    deadline: z.string().datetime().optional().nullable(),
  }),
});