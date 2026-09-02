"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocialProfileSchema = void 0;
const zod_1 = require("zod");
const socialLinkSchema = zod_1.z.object({
    platform: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(30),
    url: zod_1.z
        .string()
        .trim()
        .url(),
    label: zod_1.z
        .string()
        .trim()
        .max(50)
        .optional(),
    enabled: zod_1.z
        .boolean()
        .default(true),
    sortOrder: zod_1.z
        .number()
        .int()
        .min(0)
        .default(0),
});
exports.createSocialProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        slug: zod_1.z
            .string()
            .trim()
            .min(3)
            .max(30)
            .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores and hyphens"),
        displayName: zod_1.z
            .string()
            .trim()
            .min(1)
            .max(100),
        bio: zod_1.z
            .string()
            .trim()
            .max(300)
            .optional(),
        avatar: zod_1.z
            .string()
            .url()
            .optional(),
        isPublic: zod_1.z
            .boolean()
            .default(true),
        links: zod_1.z
            .array(socialLinkSchema)
            .min(1)
            .max(30),
    }),
});
