"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutSchema = void 0;
const zod_1 = require("zod");
exports.checkoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        plan: zod_1.z.enum(["STARTER", "PRO", "PREMIUM"]),
        interval: zod_1.z.enum(["month", "year"]).default("month"),
    }),
});
