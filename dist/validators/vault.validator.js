"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVaultItemSchema = exports.createVaultItemSchema = void 0;
const zod_1 = require("zod");
exports.createVaultItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        label: zod_1.z.string().trim().min(1).max(100),
        username: zod_1.z.string().trim().max(255).optional(),
        password: zod_1.z.string().max(255).optional(),
        url: zod_1.z.string().url().optional(),
        category: zod_1.z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]).optional(),
        notes: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        favorite: zod_1.z.boolean().optional(),
    }),
});
exports.updateVaultItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        label: zod_1.z.string().trim().min(1).max(100).optional(),
        username: zod_1.z.string().trim().max(255).optional(),
        password: zod_1.z.string().max(255).optional(),
        url: zod_1.z.string().url().optional(),
        category: zod_1.z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]).optional(),
        notes: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        favorite: zod_1.z.boolean().optional(),
    }),
});
