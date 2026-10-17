"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomerMessageSchema = void 0;
const zod_1 = require("zod");
exports.sendCustomerMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        customerIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(500),
        subject: zod_1.z.string().trim().min(1).max(200),
        body: zod_1.z.string().trim().min(1).max(5000),
    }),
});
