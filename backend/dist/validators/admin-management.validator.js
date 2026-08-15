"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSupportEmailChangeSchema = exports.deleteUserSchema = exports.supportEmailChangeSchema = exports.supportReasonSchema = exports.broadcastSchema = exports.permissionSchema = exports.createAdminSchema = exports.changeRoleSchema = void 0;
const zod_1 = require("zod");
exports.changeRoleSchema = zod_1.z.object({
    body: zod_1.z.object({ role: zod_1.z.enum(["USER", "ADMIN", "SUPER_ADMIN"]) }),
});
exports.createAdminSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(80),
        email: zod_1.z.string().trim().toLowerCase().email(),
        password: zod_1.z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
    }),
});
exports.permissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        capability: zod_1.z.enum(["MANAGE_USERS", "MANAGE_MERCHANTS", "MANAGE_CONTENT", "SEND_BROADCASTS", "VIEW_ANALYTICS", "MESSAGE_USERS"]),
    }),
});
exports.broadcastSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(120),
        message: zod_1.z.string().trim().min(1).max(1000),
        audience: zod_1.z.enum(["ALL", "USERS", "MERCHANTS"]),
    }),
});
exports.supportReasonSchema = zod_1.z.object({
    body: zod_1.z.object({
        reason: zod_1.z.string().trim().min(8).max(500),
    }),
});
exports.supportEmailChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().trim().toLowerCase().email(),
        reason: zod_1.z.string().trim().min(8).max(500),
    }),
});
exports.deleteUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        confirmationEmail: zod_1.z.string().trim().toLowerCase().email(),
        reason: zod_1.z.string().trim().min(8).max(500),
    }),
});
exports.confirmSupportEmailChangeSchema = zod_1.z.object({
    body: zod_1.z.object({ token: zod_1.z.string().trim().length(64) }),
});
