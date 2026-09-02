"use strict";
// import type { Response } from "express";
// import { asyncHandler } from "../lib/errors";
// import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
// import * as aiContextService from "../services/ai-context.service";
// import * as aiAssistantService from "../services/ai-assistant.service";
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
exports.streamReply = exports.getFocusSuggestions = exports.getContext = void 0;
const errors_1 = require("../lib/errors");
const aiContextService = __importStar(require("../services/ai-context.service"));
const aiAssistantService = __importStar(require("../services/ai-assistant.service"));
function extractGeminiErrorMessage(err) {
    if (!err) {
        return "Failed to generate a reply";
    }
    const message = err?.message ||
        err?.error?.message ||
        err?.response?.data?.error?.message ||
        "";
    if (typeof message === "string" && message.trim()) {
        return message;
    }
    return "Failed to generate a reply";
}
/**
 * GET /api/ai-assistant/context
 */
exports.getContext = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await aiContextService.getAIContext(req.user.id);
    return res.json(context);
});
/**
 * GET /api/ai-assistant/focus-suggestions
 */
exports.getFocusSuggestions = (0, errors_1.asyncHandler)(async (req, res) => {
    const suggestions = await aiContextService.getFocusSuggestions(req.user.id);
    return res.json({ suggestions });
});
/**
 * POST /api/ai-assistant/chat
 */
exports.streamReply = (0, errors_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            error: "Message is required",
        });
    }
    let wroteAnything = false;
    try {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        await aiAssistantService.streamAssistantReply(req.user.id, req.user.name ?? "there", message.trim(), (chunk) => {
            wroteAnything = true;
            res.write(chunk);
        });
        res.end();
    }
    catch (err) {
        const cleanMessage = extractGeminiErrorMessage(err);
        console.error("[ai-assistant] stream failed:", cleanMessage);
        if (!wroteAnything && !res.headersSent) {
            return res.status(typeof err?.status === "number"
                ? err.status
                : 502).json({
                error: cleanMessage,
            });
        }
        res.end();
    }
});
