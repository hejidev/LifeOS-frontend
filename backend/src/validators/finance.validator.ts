import { z } from "zod";

const calendarDay = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date format")
  .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00.000Z` : new Date(v).toISOString()));

const accountType = z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]);
const currencyCode = z.string().trim().toUpperCase().length(3);
const balance = z.number().finite().min(-1e12).max(1e12);
const limit = z.number().finite().min(0).max(1e12);
const price = z.number().finite().positive().max(1e12);

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    type: accountType,
    currency: currencyCode.default("NGN"),
    initialBalance: balance.optional(),
  }),
});

export const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    type: accountType.optional(),
    currency: currencyCode.optional(),
    balance: balance.optional(),
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
  body: z
    .object({
      name: z.string().trim().min(1).max(100),
      period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
      startDate: calendarDay,
      endDate: calendarDay,
      totalLimit: limit.default(0),
      items: z.array(z.object({ categoryId: z.string().uuid(), limitAmount: limit })).max(60).default([]),
    })
    .refine((body) => body.endDate >= body.startDate, { message: "The end date can't be before the start date", path: ["endDate"] }),
});

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: price,
    description: z.string().trim().min(1).max(255),
    date: calendarDay.optional(),
    isRecurring: z.boolean().optional(),
    linkedTaskId: z.string().uuid().optional(),
    linkedNoteId: z.string().uuid().optional(),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    accountId: z.string().uuid().nullish(),
    categoryId: z.string().uuid().nullish(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    amount: price.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    date: calendarDay.optional(),
    isRecurring: z.boolean().optional(),
  }),
});

export const transferSchema = z.object({
  body: z
    .object({
      fromAccountId: z.string().uuid(),
      toAccountId: z.string().uuid(),
      amount: price,
      note: z.string().trim().max(255).optional(),
      date: calendarDay.optional(),
    })
    .refine((body) => body.fromAccountId !== body.toAccountId, { message: "Choose two different accounts", path: ["toAccountId"] }),
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