"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRegisterSchema = exports.registerMovementSchema = exports.openRegisterSchema = exports.collectPaymentSchema = exports.adjustStockSchema = void 0;
const zod_1 = require("zod");
exports.adjustStockSchema = zod_1.z.object({
    body: zod_1.z.object({
        delta: zod_1.z
            .number()
            .int()
            .refine((value) => value !== 0, "The quantity can't be zero")
            .refine((value) => Math.abs(value) <= 100000, "That quantity is too large"),
        reason: zod_1.z.enum(["RECEIVED", "DAMAGED", "EXPIRED", "COUNT_CORRECTION", "RETURNED_TO_SUPPLIER", "OTHER"]),
        note: zod_1.z.string().trim().max(200).optional(),
        storeId: zod_1.z.string().uuid().optional(),
    }),
});
exports.collectPaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        paymentMethod: zod_1.z.enum(["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"]),
        amount: zod_1.z.number().finite().positive().max(1000000000).optional(),
    }),
});
const cashAmount = zod_1.z.number().finite().min(0).max(1000000000);
exports.openRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({ openingFloat: cashAmount, storeId: zod_1.z.string().uuid().optional() }),
});
exports.registerMovementSchema = zod_1.z.object({
    body: zod_1.z.object({
        kind: zod_1.z.enum(["PAY_IN", "PAY_OUT"]),
        amount: zod_1.z.number().finite().positive().max(1000000000),
        reason: zod_1.z.string().trim().min(2).max(100),
        storeId: zod_1.z.string().uuid().optional(),
    }),
});
exports.closeRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({ countedCash: cashAmount, note: zod_1.z.string().trim().max(200).optional(), storeId: zod_1.z.string().uuid().optional() }),
});
