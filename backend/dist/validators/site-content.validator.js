"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testimonialSchema = exports.teamMemberSchema = void 0;
const zod_1 = require("zod");
exports.teamMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        role: zod_1.z.string().trim().min(1).max(100),
        bio: zod_1.z.string().max(500).optional(),
        imageUrl: zod_1.z.string().url().optional(),
        linkedinUrl: zod_1.z.string().url().optional(),
        twitterUrl: zod_1.z.string().url().optional(),
        githubUrl: zod_1.z.string().url().optional(),
        isFounder: zod_1.z.boolean().optional(),
        order: zod_1.z.number().int().optional(),
    }),
});
exports.testimonialSchema = zod_1.z.object({
    body: zod_1.z.object({
        quote: zod_1.z.string().trim().min(1).max(500),
        name: zod_1.z.string().trim().min(1).max(100),
        role: zod_1.z.string().max(150).optional(),
        avatarUrl: zod_1.z.string().url().optional(),
        order: zod_1.z.number().int().optional(),
    }),
});
