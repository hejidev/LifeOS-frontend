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
exports.contactSupport = exports.getMessages = exports.listConversations = exports.sendMessage = exports.startConversation = void 0;
const errors_1 = require("../lib/errors");
const dmService = __importStar(require("../services/dm.service"));
exports.startConversation = (0, errors_1.asyncHandler)(async (req, res) => {
    const { userId, message } = req.body;
    if (userId === req.user.id)
        throw new errors_1.AppError("You can't message yourself", 400);
    const msg = await dmService.sendMessage(req.user.id, userId, message);
    return res.status(201).json({ message: msg });
});
exports.sendMessage = (0, errors_1.asyncHandler)(async (req, res) => {
    const convo = await dmService.getConversationOrThrow(req.user.id, req.params.conversationId);
    const recipientId = convo.participantAId === req.user.id ? convo.participantBId : convo.participantAId;
    const msg = await dmService.sendMessage(req.user.id, recipientId, req.body.body);
    return res.status(201).json({ message: msg });
});
exports.listConversations = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json({ conversations: await dmService.listConversations(req.user.id) });
});
exports.getMessages = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json({ messages: await dmService.getMessages(req.user.id, req.params.conversationId) });
});
exports.contactSupport = (0, errors_1.asyncHandler)(async (req, res) => {
    const msg = await dmService.contactSupport(req.user.id, req.body.message);
    return res.status(201).json({ message: msg });
});
