"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSocialProfileSchema = exports.createSocialProfileSchema = void 0;
const zod_1 = require("zod");
const safe_url_1 = require("../lib/safe-url");
const RESERVED = ["admin", "api", "app", "login", "signup", "settings", "connect", "www", "support", "lifeos"];
const link = zod_1.z.object({
    platform: zod_1.z.string().trim().min(1).max(30),
    url: safe_url_1.linkUrl,
    label: zod_1.z.string().trim().max(50).optional(),
    enabled: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().int().min(0).max(100).default(0),
});
const profileFields = {
    displayName: zod_1.z.string().trim().min(1).max(100),
    bio: zod_1.z.string().trim().max(300).optional(),
    avatar: safe_url_1.webUrl.optional(),
    isPublic: zod_1.z.boolean().default(true),
    links: zod_1.z.array(link).min(1).max(30),
};
exports.createSocialProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        slug: zod_1.z
            .string()
            .trim()
            .toLowerCase()
            .min(3)
            .max(30)
            .regex(/^[a-z0-9_-]+$/, "Username can only contain letters, numbers, underscores and hyphens")
            .refine((value) => !RESERVED.includes(value), "That username isn't available"),
        ...profileFields,
    }),
});
exports.updateSocialProfileSchema = zod_1.z.object({ body: zod_1.z.object(profileFields) });
