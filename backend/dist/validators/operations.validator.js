"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStockSchema = void 0;
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
