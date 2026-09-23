"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStoreSchema = exports.createStoreSchema = void 0;
const zod_1 = require("zod");
exports.createStoreSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(120),
        address: zod_1.z.string().trim().max(255).optional(),
        phone: zod_1.z.string().trim().max(32).optional(),
    }),
});
exports.updateStoreSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(120).optional(),
        address: zod_1.z.string().trim().max(255).optional(),
        phone: zod_1.z.string().trim().max(32).optional(),
        active: zod_1.z.boolean().optional(),
    }),
});
