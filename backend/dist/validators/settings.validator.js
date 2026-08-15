"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateNotificationsSchema = exports.updatePreferencesSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(120).optional(),
        avatarUrl: zod_1.z.string().url().optional(),
        timezone: zod_1.z.string().max(64).optional(),
        location: zod_1.z.string().max(120).optional(),
        currency: zod_1.z.string().length(3).optional(),
    }),
});
exports.updatePreferencesSchema = zod_1.z.object({
    body: zod_1.z.object({
        darkMode: zod_1.z.boolean().optional(),
        weekStartsOn: zod_1.z.number().int().min(0).max(1).optional(),
    }),
});
exports.updateNotificationsSchema = zod_1.z.object({
    body: zod_1.z.object({
        notifyTasks: zod_1.z.boolean().optional(),
        notifyCalendar: zod_1.z.boolean().optional(),
        notifyFinance: zod_1.z.boolean().optional(),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(8),
        newPassword: zod_1.z.string().min(8).max(128),
    }),
});
