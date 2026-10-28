"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushTokenRemovalSchema = exports.pushTokenSchema = exports.sendChatMessageSchema = void 0;
const zod_1 = require("zod");
const tokenPattern = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
exports.sendChatMessageSchema = zod_1.z.object({
    body: zod_1.z.object({ body: zod_1.z.string().trim().min(1).max(2000) }),
});
exports.pushTokenSchema = zod_1.z.object({
    body: zod_1.z.object({ token: zod_1.z.string().regex(tokenPattern), platform: zod_1.z.string().max(20) }),
});
exports.pushTokenRemovalSchema = zod_1.z.object({
    body: zod_1.z.object({ token: zod_1.z.string().regex(tokenPattern) }),
});
