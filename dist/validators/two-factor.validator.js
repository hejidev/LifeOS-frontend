"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableTwoFactorSchema = exports.verifyCodeSchema = void 0;
// src/validators/two-factor.validator.ts
const zod_1 = require("zod");
exports.verifyCodeSchema = zod_1.z.object({ body: zod_1.z.object({ code: zod_1.z.string().length(6) }) });
exports.disableTwoFactorSchema = zod_1.z.object({
    body: zod_1.z.object({
        password: zod_1.z.string().min(1),
        code: zod_1.z.string().length(6),
    }),
});
