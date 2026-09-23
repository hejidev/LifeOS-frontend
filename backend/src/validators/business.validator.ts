import { z } from "zod";

export const updateBizProfileSchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(1).max(120).optional(),
    currency: z.string().trim().length(3).optional(),
    logoUrl: z.string().url().optional(),
    loyaltyEnabled: z.boolean().optional(),
    loyaltyEarnRate: z.number().int().min(0).max(1000).optional(),
    loyaltyRedemptionValue: z.number().int().min(0).max(1000).optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160),
    sku: z.string().trim().max(64).optional(),
    category: z.string().trim().max(64).optional(),
    price: z.number().nonnegative(),
    cost: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative().default(0),
    lowStockAt: z.number().int().nonnegative().default(3),
    imageUrl: z.string().url().optional(),
    storeId: z.string().uuid().optional(),
    barcode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined))
      .refine((v) => v === undefined || /^[a-zA-Z0-9-]{3,64}$/.test(v), {
        message: "Barcode can only contain letters, numbers, and hyphens",
      }),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160).optional(),
    sku: z.string().trim().max(64).optional(),
    category: z.string().trim().max(64).optional(),
    price: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    lowStockAt: z.number().int().nonnegative().optional(),
    imageUrl: z.string().url().optional(),
    active: z.boolean().optional(),
    storeId: z.string().uuid().optional(),
    barcode: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined))
      .refine((v) => v === undefined || /^[a-zA-Z0-9-]{3,64}$/.test(v), {
        message: "Barcode can only contain letters, numbers, and hyphens",
      }),
  }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(32).optional(),
    email: z.string().email().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.string().email().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const createSaleSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid().optional(),
          name: z.string().trim().min(1),
          quantity: z.number().int().positive(),
          unitPrice: z.number().nonnegative(),
        })
      )
      .min(1),
    discount: z.number().nonnegative().default(0),
    paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"]).default("CASH"),
    status: z.enum(["PAID", "PENDING", "REFUNDED", "CANCELLED"]).default("PAID"),
    note: z.string().max(500).optional(),
    storeId: z.string().uuid().optional(),
    redeemPoints: z.number().int().nonnegative().optional(),
  }),
});

export const updateSaleStatusSchema = z.object({
  body: z.object({
    status: z.enum(["PAID", "PENDING", "REFUNDED", "CANCELLED"]),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(160),
    category: z
      .enum(["INVENTORY", "RENT", "UTILITIES", "SALARY", "MARKETING", "SUPPLIES", "OTHER"])
      .default("OTHER"),
    amount: z.number().positive(),
    date: z.string().optional(),
    note: z.string().max(500).optional(),
    storeId: z.string().uuid().optional(),
  }),
});

export const dashboardQuerySchema = z.object({
  query: z.object({
    range: z.enum(["today", "week", "month"]).default("today"),
  }),
});
