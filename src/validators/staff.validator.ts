import { z } from "zod";

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email().optional(),
    phone: z.string().trim().max(32).optional(),
    address: z.string().trim().max(255).optional(),
    age: z.coerce.number().int().min(16).max(100).optional(),
    sex: z.string().trim().max(20).optional(),
    tribe: z.string().trim().max(50).optional(),
    religion: z.string().trim().max(50).optional(),
    role: z.enum(["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"]).default("CASHIER"),
    pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().max(32).optional(),
    address: z.string().trim().max(255).optional(),
    age: z.coerce.number().int().min(16).max(100).optional(),
    sex: z.string().trim().max(20).optional(),
    tribe: z.string().trim().max(50).optional(),
    religion: z.string().trim().max(50).optional(),
    role: z.enum(["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    pin: z.string().regex(/^\d{4,6}$/).optional(),
  }),
});

export const clockInSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
    pin: z.string().regex(/^\d{4,6}$/),
  }),
});

export const logActivitySchema = z.object({
  body: z.object({
    action: z.enum(["LOGIN", "SALE_CREATED", "PRODUCT_UPDATED", "PRODUCT_CREATED", "CUSTOMER_ADDED", "EXPENSE_CREATED", "REFUND_ISSUED", "OTHER"]),
    description: z.string().trim().min(1).max(300),
    metadata: z.record(z.any()).optional(),
  }),
});