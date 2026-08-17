"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInviteSchema = exports.createInviteSchema = exports.updateControlSchema = exports.createControlSchema = exports.updateMemberSchema = exports.createMemberSchema = void 0;
const zod_1 = require("zod");
exports.createMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        role: zod_1.z.enum(["PARENT", "GUARDIAN", "CHILD"]),
        device: zod_1.z.string().optional(),
        locationSharing: zod_1.z.boolean().optional(),
    }),
});
exports.updateMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100).optional(),
        role: zod_1.z.enum(["PARENT", "GUARDIAN", "CHILD"]).optional(),
        device: zod_1.z.string().optional(),
        locationSharing: zod_1.z.boolean().optional(),
        status: zod_1.z.enum(["ONLINE", "OFFLINE", "AWAY"]).optional(),
        screenTimeMinutesToday: zod_1.z.number().int().min(0).optional(),
        avatarUrl: zod_1.z.string().url().optional(),
    }),
});
exports.createControlSchema = zod_1.z.object({
    body: zod_1.z.object({
        memberId: zod_1.z.string().uuid().optional(),
        title: zod_1.z.string().trim().min(1).max(150),
        description: zod_1.z.string().optional(),
        enabled: zod_1.z.boolean().optional(),
        value: zod_1.z.string().optional(),
    }),
});
exports.updateControlSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(150).optional(),
        description: zod_1.z.string().optional(),
        enabled: zod_1.z.boolean().optional(),
        value: zod_1.z.string().optional(),
    }),
});
exports.createInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().trim().toLowerCase().email(),
        role: zod_1.z.enum(["PARENT", "GUARDIAN", "CHILD"]).default("CHILD"),
    }),
});
exports.acceptInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1),
        name: zod_1.z.string().trim().min(1).max(100),
    }),
});
