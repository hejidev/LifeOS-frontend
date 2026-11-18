"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationParamsSchema = exports.chatMessageSchema = void 0;
const zod_1 = require("zod");
exports.chatMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: zod_1.z.string().trim().min(1).max(2000),
        conversationId: zod_1.z.string().uuid().optional(),
    }),
});
exports.conversationParamsSchema = zod_1.z.object({ params: zod_1.z.object({ id: zod_1.z.string().uuid() }) });
