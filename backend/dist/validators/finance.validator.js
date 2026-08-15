"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.updateTransactionSchema = exports.createTransactionSchema = exports.createBudgetSchema = exports.createCategorySchema = exports.updateAccountSchema = exports.createAccountSchema = void 0;
const zod_1 = require("zod");
const dateStringSchema = zod_1.z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date format")
    .transform((v) => new Date(v).toISOString());
exports.createAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        type: zod_1.z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]),
        currency: zod_1.z.string().trim().min(3).max(10).default("USD"),
        initialBalance: zod_1.z.number().optional(),
    }),
});
exports.updateAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        type: zod_1.z.enum(["CASH", "BANK", "MOBILE_MONEY", "CARD", "SAVINGS", "INVESTMENT"]).optional(),
        currency: zod_1.z.string().trim().min(3).max(10).optional(),
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
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        period: zod_1.z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
        startDate: dateStringSchema,
        endDate: dateStringSchema,
        totalLimit: zod_1.z.number().nonnegative().default(0),
        items: zod_1.z
            .array(zod_1.z.object({
            categoryId: zod_1.z.string().uuid(),
            limitAmount: zod_1.z.number().nonnegative().default(0),
        }))
            .default([]),
    }),
});
exports.createTransactionSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().uuid().optional(),
        categoryId: zod_1.z.string().uuid().optional(),
        type: zod_1.z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
        amount: zod_1.z.number().positive(),
        description: zod_1.z.string().trim().min(1).max(255),
        date: dateStringSchema.optional(),
        isRecurring: zod_1.z.boolean().optional(),
        linkedTaskId: zod_1.z.string().uuid().optional(),
        linkedNoteId: zod_1.z.string().uuid().optional(),
    }),
});
exports.updateTransactionSchema = zod_1.z.object({
    body: zod_1.z.object({
        accountId: zod_1.z.string().uuid().optional(),
        categoryId: zod_1.z.string().uuid().optional(),
        type: zod_1.z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
        amount: zod_1.z.number().positive().optional(),
        description: zod_1.z.string().trim().min(1).max(255).optional(),
        date: dateStringSchema.optional(),
        isRecurring: zod_1.z.boolean().optional(),
    }),
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
