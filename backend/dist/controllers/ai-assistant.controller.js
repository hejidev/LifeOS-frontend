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
exports.createBrief = exports.getBrief = exports.streamReply = exports.deleteConversation = exports.getConversation = exports.listConversations = exports.getFocusSuggestions = exports.getContext = void 0;
const errors_1 = require("../lib/errors");
const aiContextService = __importStar(require("../services/ai-context.service"));
const assistantContext = __importStar(require("../services/assistant-context.service"));
const assistant = __importStar(require("../services/ai-assistant.service"));
const dailyBrief = __importStar(require("../services/daily-brief.service"));
exports.getContext = (0, errors_1.asyncHandler)(async (req, res) => res.json(await assistantContext.getAssistantContext(req.user.id)));
exports.getFocusSuggestions = (0, errors_1.asyncHandler)(async (req, res) => res.json({ suggestions: await aiContextService.getFocusSuggestions(req.user.id) }));
exports.listConversations = (0, errors_1.asyncHandler)(async (req, res) => res.json({ conversations: await assistant.listConversations(req.user.id) }));
exports.getConversation = (0, errors_1.asyncHandler)(async (req, res) => res.json({ conversation: await assistant.getConversation(req.user.id, req.params.id) }));
exports.deleteConversation = (0, errors_1.asyncHandler)(async (req, res) => {
    await assistant.deleteConversation(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.streamReply = (0, errors_1.asyncHandler)(async (req, res) => {
    const { message, conversationId } = req.body;
    let aborted = false;
    let started = false;
    res.on("close", () => {
        if (!res.writableEnded)
            aborted = true;
    });
    try {
        await assistant.streamAssistantReply({
            userId: req.user.id,
            message,
            conversationId,
            isAborted: () => aborted,
            onStart: (id) => {
                started = true;
                res.status(200);
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("X-Accel-Buffering", "no");
                res.setHeader("X-Conversation-Id", id);
            },
            onDelta: (text) => res.write(text),
        });
        res.end();
    }
    catch (error) {
        if (!started)
            throw error;
        res.end();
    }
});
exports.getBrief = (0, errors_1.asyncHandler)(async (req, res) => res.json(await dailyBrief.getBrief(req.user.id)));
exports.createBrief = (0, errors_1.asyncHandler)(async (req, res) => res.json(await dailyBrief.generateBrief(req.user.id)));
