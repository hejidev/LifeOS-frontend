"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.createExpenseSchema = exports.updateSaleStatusSchema = exports.createSaleSchema = exports.updateCustomerSchema = exports.createCustomerSchema = exports.updateProductSchema = exports.createProductSchema = exports.updateBizProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateBizProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        businessName: zod_1.z.string().trim().min(1).max(120).optional(),
        currency: zod_1.z.string().trim().length(3).optional(),
        logoUrl: zod_1.z.string().url().optional(),
        loyaltyEnabled: zod_1.z.boolean().optional(),
        loyaltyEarnRate: zod_1.z.number().int().min(0).max(1000).optional(),
        loyaltyRedemptionValue: zod_1.z.number().int().min(0).max(1000).optional(),
    }),
});
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(160),
        sku: zod_1.z.string().trim().max(64).optional(),
        category: zod_1.z.string().trim().max(64).optional(),
        price: zod_1.z.number().nonnegative(),
        cost: zod_1.z.number().nonnegative().optional(),
        stock: zod_1.z.number().int().nonnegative().default(0),
        lowStockAt: zod_1.z.number().int().nonnegative().default(3),
        imageUrl: zod_1.z.string().url().optional(),
        storeId: zod_1.z.string().uuid().optional(),
        barcode: zod_1.z
            .string()
            .trim()
            .optional()
            .transform((v) => (v && v.length > 0 ? v : undefined))
            .refine((v) => v === undefined || /^[a-zA-Z0-9-]{3,64}$/.test(v), {
            message: "Barcode can only contain letters, numbers, and hyphens",
        }),
    }),
});
exports.updateProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(160).optional(),
        sku: zod_1.z.string().trim().max(64).optional(),
        category: zod_1.z.string().trim().max(64).optional(),
        price: zod_1.z.number().nonnegative().optional(),
        cost: zod_1.z.number().nonnegative().optional(),
        stock: zod_1.z.number().int().nonnegative().optional(),
        lowStockAt: zod_1.z.number().int().nonnegative().optional(),
        imageUrl: zod_1.z.string().url().optional(),
        active: zod_1.z.boolean().optional(),
        storeId: zod_1.z.string().uuid().optional(),
        barcode: zod_1.z
            .string()
            .trim()
            .optional()
            .transform((v) => (v && v.length > 0 ? v : undefined))
            .refine((v) => v === undefined || /^[a-zA-Z0-9-]{3,64}$/.test(v), {
            message: "Barcode can only contain letters, numbers, and hyphens",
        }),
    }),
});
exports.createCustomerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(160),
        phone: zod_1.z.string().trim().max(32).optional(),
        email: zod_1.z.string().email().optional(),
        notes: zod_1.z.string().max(1000).optional(),
    }),
});
exports.updateCustomerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(160).optional(),
        phone: zod_1.z.string().trim().max(32).optional(),
        email: zod_1.z.string().email().optional(),
        notes: zod_1.z.string().max(1000).optional(),
    }),
});
exports.createSaleSchema = zod_1.z.object({
    body: zod_1.z.object({
        customerId: zod_1.z.string().uuid().optional(),
        items: zod_1.z
            .array(zod_1.z.object({
            productId: zod_1.z.string().uuid().optional(),
            name: zod_1.z.string().trim().min(1),
            quantity: zod_1.z.number().int().positive(),
            unitPrice: zod_1.z.number().nonnegative(),
        }))
            .min(1),
        discount: zod_1.z.number().nonnegative().default(0),
        paymentMethod: zod_1.z.enum(["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"]).default("CASH"),
        status: zod_1.z.enum(["PAID", "PENDING", "REFUNDED", "CANCELLED"]).default("PAID"),
        note: zod_1.z.string().max(500).optional(),
        storeId: zod_1.z.string().uuid().optional(),
        redeemPoints: zod_1.z.number().int().nonnegative().optional(),
    }),
});
exports.updateSaleStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(["PAID", "PENDING", "REFUNDED", "CANCELLED"]),
    }),
});
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(160),
        category: zod_1.z
            .enum(["INVENTORY", "RENT", "UTILITIES", "SALARY", "MARKETING", "SUPPLIES", "OTHER"])
            .default("OTHER"),
        amount: zod_1.z.number().positive(),
        date: zod_1.z.string().optional(),
        note: zod_1.z.string().max(500).optional(),
        storeId: zod_1.z.string().uuid().optional(),
    }),
});
exports.dashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        range: zod_1.z.enum(["today", "week", "month"]).default("today"),
    }),
});
