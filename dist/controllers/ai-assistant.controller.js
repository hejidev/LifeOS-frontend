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
exports.streamReply = exports.getFocusSuggestions = exports.getContext = void 0;
const errors_1 = require("../lib/errors");
const aiContextService = __importStar(require("../services/ai-context.service"));
const aiAssistantService = __importStar(require("../services/ai-assistant.service"));
function extractAnthropicErrorMessage(err) {
    const raw = err?.message ?? "";
    const match = raw.match(/^\d+\s+(\{.*\})$/s);
    if (match) {
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed?.error?.message)
                return parsed.error.message;
        }
        catch { }
    }
    return raw || "Failed to generate a reply";
}
exports.getContext = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await aiContextService.getAIContext(req.user.id);
    return res.json(context);
});
exports.getFocusSuggestions = (0, errors_1.asyncHandler)(async (req, res) => {
    const suggestions = await aiContextService.getFocusSuggestions(req.user.id);
    return res.json({ suggestions });
});
exports.streamReply = (0, errors_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    let wroteAnything = false;
    try {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        await aiAssistantService.streamAssistantReply(req.user.id, req.user.name ?? "there", message, (chunk) => {
            wroteAnything = true;
            res.write(chunk);
        });
        res.end();
    }
    catch (err) {
        const cleanMessage = extractAnthropicErrorMessage(err);
        console.error("[ai-assistant] stream failed:", cleanMessage);
        if (!wroteAnything && !res.headersSent) {
            res.status(typeof err?.status === "number" ? err.status : 502).json({ error: cleanMessage });
        }
        else {
            res.end();
        }
    }
});
