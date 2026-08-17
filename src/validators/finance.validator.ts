import { z } from "zod";


const dateStringSchema = z
  .string()
  .refine(
    (v) => !Number.isNaN(Date.parse(v)),
    "Invalid date format"
  )
  .transform((v) => new Date(v).toISOString());

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]),
    currency: z.string().trim().min(3).max(10).default("USD"),
    initialBalance: z.number().optional(),
  }),
});

export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]).optional(),
    currency: z.string().trim().min(3).max(10).optional(),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(64),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),
});

export const createBudgetSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    totalLimit: z.number().nonnegative().default(0),
    items: z
      .array(
        z.object({
          categoryId: z.string().uuid(),
          limitAmount: z.number().nonnegative().default(0),
        }),
      )
      .default([]),
  }),
});

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(255),
    date: dateStringSchema.optional(),
    isRecurring: z.boolean().optional(),
    linkedTaskId: z.string().uuid().optional(),
    linkedNoteId: z.string().uuid().optional(),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    accountId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    amount: z.number().positive().optional(),
    description: z.string().trim().min(1).max(255).optional(),
    date: dateStringSchema.optional(),
    isRecurring: z.boolean().optional(),
  }),
});

export const dashboardQuerySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform((v) => parseInt(v, 10))
      .optional(),
    year: z
      .string()
      .regex(/^\d{4}$/)
      .transform((v) => parseInt(v, 10))
      .optional(),
  }),
});