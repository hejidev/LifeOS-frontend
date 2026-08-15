"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactSupportSchema = exports.sendMessageSchema = exports.startConversationSchema = void 0;
// src/validators/dm.validator.ts
const zod_1 = require("zod");
exports.startConversationSchema = zod_1.z.object({
    body: zod_1.z.object({ userId: zod_1.z.string().uuid(), message: zod_1.z.string().trim().min(1).max(2000) }),
});
exports.sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({ body: zod_1.z.string().trim().min(1).max(2000) }),
});
exports.contactSupportSchema = zod_1.z.object({
    body: zod_1.z.object({ message: zod_1.z.string().trim().min(1).max(2000) })
});
