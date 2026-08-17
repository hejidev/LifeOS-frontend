"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivitySchema = exports.clockInSchema = exports.updateStaffSchema = exports.createStaffSchema = void 0;
const zod_1 = require("zod");
exports.createStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(120),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().trim().max(32).optional(),
        address: zod_1.z.string().trim().max(255).optional(),
        age: zod_1.z.coerce.number().int().min(16).max(100).optional(),
        sex: zod_1.z.string().trim().max(20).optional(),
        tribe: zod_1.z.string().trim().max(50).optional(),
        religion: zod_1.z.string().trim().max(50).optional(),
        role: zod_1.z.enum(["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"]).default("CASHIER"),
        pin: zod_1.z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
    }),
});
exports.updateStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(120).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().trim().max(32).optional(),
        address: zod_1.z.string().trim().max(255).optional(),
        age: zod_1.z.coerce.number().int().min(16).max(100).optional(),
        sex: zod_1.z.string().trim().max(20).optional(),
        tribe: zod_1.z.string().trim().max(50).optional(),
        religion: zod_1.z.string().trim().max(50).optional(),
        role: zod_1.z.enum(["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"]).optional(),
        status: zod_1.z.enum(["ACTIVE", "SUSPENDED"]).optional(),
        pin: zod_1.z.string().regex(/^\d{4,6}$/).optional(),
    }),
});
exports.clockInSchema = zod_1.z.object({
    body: zod_1.z.object({
        staffId: zod_1.z.string().uuid(),
        pin: zod_1.z.string().regex(/^\d{4,6}$/),
    }),
});
exports.logActivitySchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(["LOGIN", "SALE_CREATED", "PRODUCT_UPDATED", "PRODUCT_CREATED", "CUSTOMER_ADDED", "EXPENSE_CREATED", "REFUND_ISSUED", "OTHER"]),
        description: zod_1.z.string().trim().min(1).max(300),
        metadata: zod_1.z.record(zod_1.z.any()).optional(),
    }),
});
