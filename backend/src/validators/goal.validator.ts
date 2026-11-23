import { z } from "zod";

const goalModule = z.enum([
  "TASKS",
  "FINANCE",
  "STUDY",
  "HEALTH",
  "CAREER",
  "OTHER",
]);

const amount = z.number().finite().min(0).max(1e12);

export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150),
    module: goalModule.default("OTHER"),
    target: amount.refine(
      (value) => value > 0,
      "The target must be above zero"
    ),
    progress: amount.optional(),
    unit: z.string().trim().max(20).optional(),
    deadline: z.string().datetime().optional(),
  }),
});

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150).optional(),
    module: goalModule.optional(),
    target: amount
      .refine((value) => value > 0, "The target must be above zero")
      .optional(),
    progress: amount.optional(),
    unit: z.string().trim().max(20).nullable().optional(),
    deadline: z.string().datetime().nullable().optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
  }),
});