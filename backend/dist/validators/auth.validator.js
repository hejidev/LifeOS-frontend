"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLoginCodeSchema = exports.requestLoginCodeSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(80),
        email: zod_1.z.string().trim().toLowerCase().email(),
        password: zod_1.z
            .string()
            .min(12, "Password must be at least 12 characters")
            .max(72)
            .regex(/[a-z]/, "Password must include a lowercase letter")
            .regex(/[A-Z]/, "Password must include an uppercase letter")
            .regex(/[0-9]/, "Password must include a number")
            .regex(/[^A-Za-z0-9]/, "Password must include a symbol"),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().trim().toLowerCase().email(),
        password: zod_1.z.string().min(1, "Password is required"),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().trim().toLowerCase().email(),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1),
        password: zod_1.z
            .string()
            .min(12)
            .max(72)
            .regex(/[a-z]/, "Password must include a lowercase letter")
            .regex(/[A-Z]/, "Password must include an uppercase letter")
            .regex(/[0-9]/, "Password must include a number")
            .regex(/[^A-Za-z0-9]/, "Password must include a symbol"),
    }),
});
exports.requestLoginCodeSchema = zod_1.z.object({
    body: zod_1.z.object({ email: zod_1.z.string().trim().toLowerCase().email() }),
});
exports.verifyLoginCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        challengeId: zod_1.z.string().uuid(),
        code: zod_1.z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    }),
});
