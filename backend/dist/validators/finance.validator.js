"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.transferSchema = exports.updateTransactionSchema = exports.createTransactionSchema = exports.createBudgetSchema = exports.createCategorySchema = exports.updateAccountSchema = exports.createAccountSchema = void 0;
const zod_1 = require("zod");
const calendarDay = zod_1.z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date format")
    .transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00.000Z` : new Date(v).toISOString()));
const accountType = zod_1.z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]);
const currencyCode = zod_1.z.string().trim().toUpperCase().length(3);
const balance = zod_1.z.number().finite().min(-1e12).max(1e12);
const limit = zod_1.z.number().finite().min(0).max(1e12);
const price = zod_1.z.number().finite().positive().max(1e12);
exports.createAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        type: accountType,
        currency: currencyCode.default("NGN"),
        initialBalance: balance.optional(),
    }),
});
exports.updateAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        type: accountType.optional(),
        currency: currencyCode.optional(),
        balance: balance.optional(),
    }),
});
exports.createCategorySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(64),
        type: zod_1.z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
        color: zod_1.z.string().optional(),
        icon: zod_1.z.string().optional(),
    }),
});
exports.createBudgetSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().trim().min(1).max(100),
        period: zod_1.z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
        startDate: calendarDay,
        endDate: calendarDay,
        totalLimit: limit.default(0),
        items: zod_1.z.array(zod_1.z.object({ categoryId: zod_1.z.string().uuid(), limitAmount: limit })).max(60).default([]),
    })
        .refine((body) => body.endDate >= body.startDate, { message: "The end date can't be before the start date", path: ["endDate"] }),
});
exports.createTransactionSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().uuid().optional(),
        categoryId: zod_1.z.string().uuid().optional(),
        type: zod_1.z.enum(["INCOME", "EXPENSE"]),
        amount: price,
        description: zod_1.z.string().trim().min(1).max(255),
        date: calendarDay.optional(),
        isRecurring: zod_1.z.boolean().optional(),
        linkedTaskId: zod_1.z.string().uuid().optional(),
        linkedNoteId: zod_1.z.string().uuid().optional(),
    }),
});
exports.updateTransactionSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().uuid().nullish(),
        categoryId: zod_1.z.string().uuid().nullish(),
        type: zod_1.z.enum(["INCOME", "EXPENSE"]).optional(),
        amount: price.optional(),
        description: zod_1.z.string().trim().min(1).max(255).optional(),
        date: calendarDay.optional(),
        isRecurring: zod_1.z.boolean().optional(),
    }),
});
exports.transferSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        fromAccountId: zod_1.z.string().uuid(),
        toAccountId: zod_1.z.string().uuid(),
        amount: price,
        note: zod_1.z.string().trim().max(255).optional(),
        date: calendarDay.optional(),
    })
        .refine((body) => body.fromAccountId !== body.toAccountId, { message: "Choose two different accounts", path: ["toAccountId"] }),
});
exports.dashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        month: zod_1.z
            .string()
            .regex(/^\d{1,2}$/)
            .transform((v) => parseInt(v, 10))
            .optional(),
        year: zod_1.z
            .string()
            .regex(/^\d{4}$/)
            .transform((v) => parseInt(v, 10))
            .optional(),
    }),
});
