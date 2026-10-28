"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const merchant_middleware_1 = require("../middlewares/merchant.middleware");
const staff_session_middleware_1 = require("../middlewares/staff-session.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const chat = __importStar(require("../controllers/chat.controller"));
const chat_validator_1 = require("../validators/chat.validator");
const router = (0, express_1.Router)();
const owner = [auth_middleware_1.requireAuth, merchant_middleware_1.requireMerchant];
router.get("/merchant/chat/threads", ...owner, chat.ownerChat.threads);
router.get("/merchant/chat/unread-count", ...owner, chat.ownerChat.unread);
router.get("/merchant/chat/threads/:threadId/messages", ...owner, chat.ownerChat.messages);
router.post("/merchant/chat/threads/:threadId/messages", ...owner, (0, validate_middleware_1.validate)(chat_validator_1.sendChatMessageSchema), chat.ownerChat.send);
router.post("/merchant/chat/threads/:threadId/read", ...owner, chat.ownerChat.read);
router.get("/staff-chat/threads", staff_session_middleware_1.requireStaffSession, chat.staffChat.threads);
router.get("/staff-chat/unread-count", staff_session_middleware_1.requireStaffSession, chat.staffChat.unread);
router.get("/staff-chat/threads/:threadId/messages", staff_session_middleware_1.requireStaffSession, chat.staffChat.messages);
router.post("/staff-chat/threads/:threadId/messages", staff_session_middleware_1.requireStaffSession, (0, validate_middleware_1.validate)(chat_validator_1.sendChatMessageSchema), chat.staffChat.send);
router.post("/staff-chat/threads/:threadId/read", staff_session_middleware_1.requireStaffSession, chat.staffChat.read);
router.post("/push/register", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(chat_validator_1.pushTokenSchema), chat.registerOwnerPush);
router.post("/push/unregister", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(chat_validator_1.pushTokenRemovalSchema), chat.removeOwnerPush);
router.post("/staff-push/register", staff_session_middleware_1.requireStaffSession, (0, validate_middleware_1.validate)(chat_validator_1.pushTokenSchema), chat.registerStaffPush);
router.post("/staff-push/unregister", staff_session_middleware_1.requireStaffSession, (0, validate_middleware_1.validate)(chat_validator_1.pushTokenRemovalSchema), chat.removeStaffPush);
exports.default = router;
