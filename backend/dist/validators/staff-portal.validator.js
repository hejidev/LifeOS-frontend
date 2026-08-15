"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSelfActivitySchema = void 0;
const zod_1 = require("zod");
exports.logSelfActivitySchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(["SALE_CREATED", "CUSTOMER_ADDED", "PRODUCT_UPDATED", "REFUND_ISSUED", "OTHER"]),
        description: zod_1.z.string().trim().min(1).max(300),
    }),
});
