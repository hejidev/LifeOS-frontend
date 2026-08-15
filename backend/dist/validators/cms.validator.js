"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewContentSchema = exports.updateContentSchema = exports.createContentSchema = void 0;
// src/validators/cms.validator.ts
const zod_1 = require("zod");
exports.createContentSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(["ABOUT", "CONTACT", "BLOG", "FAQ"]),
        title: zod_1.z.string().trim().min(1).max(200),
        excerpt: zod_1.z.string().max(300).optional(),
        body: zod_1.z.string().min(1),
        coverImageUrl: zod_1.z.string().url().optional(),
        order: zod_1.z.number().int().optional(),
    }),
});
exports.updateContentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        excerpt: zod_1.z.string().max(300).optional(),
        body: zod_1.z.string().min(1).optional(),
        coverImageUrl: zod_1.z.string().url().optional(),
        order: zod_1.z.number().int().optional(),
    }),
});
exports.reviewContentSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(["APPROVE", "REJECT"]),
        note: zod_1.z.string().max(500).optional(),
    }),
});
