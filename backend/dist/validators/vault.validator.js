"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVaultItemSchema = exports.createVaultItemSchema = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
const category = zod_1.z.enum(["WEBSITE", "APP", "BANK", "CARD", "NOTE"]);
const tags = zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).max(20);
exports.createVaultItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        label: zod_1.z.string().trim().min(1).max(100),
        username: zod_1.z.string().trim().max(255).optional(),
        password: zod_1.z.string().min(1).max(255).optional(),
        url: safe_url_1.webUrl.optional(),
        category: category.optional(),
        notes: zod_1.z.string().max(5000).optional(),
        tags: tags.optional(),
        favorite: zod_1.z.boolean().optional(),
    }),
});
exports.updateVaultItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        label: zod_1.z.string().trim().min(1).max(100).optional(),
        username: zod_1.z.string().trim().max(255).nullable().optional(),
        password: zod_1.z.string().min(1).max(255).optional(),
        url: safe_url_1.webUrl.nullable().optional(),
        category: category.optional(),
        notes: zod_1.z.string().max(5000).nullable().optional(),
        tags: tags.optional(),
        favorite: zod_1.z.boolean().optional(),
    }),
});
