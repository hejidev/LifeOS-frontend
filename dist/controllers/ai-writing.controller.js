"use strict";
// import type { Response } from "express";
// import { asyncHandler } from "../lib/errors";
// import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
// import * as aiWritingService from "../services/ai-writing.service";
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
exports.convertToNote = exports.deleteDocument = exports.getDocuments = exports.saveDocument = exports.streamWritingHandler = void 0;
const errors_1 = require("../lib/errors");
const aiWritingService = __importStar(require("../services/ai-writing.service"));
function extractGeminiErrorMessage(err) {
    if (!err) {
        return "Failed to generate content";
    }
    const message = err?.message ||
        err?.error?.message ||
        err?.response?.data?.error?.message ||
        "";
    if (typeof message === "string" && message.trim()) {
        return message;
    }
    return "Failed to generate content";
}
exports.streamWritingHandler = (0, errors_1.asyncHandler)(async (req, res) => {
    const { mode, input, tone, targetLanguage, } = req.body;
    if (!input?.trim()) {
        return res.status(400).json({
            error: "Input text is required",
        });
    }
    let wroteAnything = false;
    try {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        await aiWritingService.streamWriting(mode, input, {
            tone,
            targetLanguage,
        }, (chunk) => {
            wroteAnything = true;
            res.write(chunk);
        });
        res.end();
    }
    catch (err) {
        const cleanMessage = extractGeminiErrorMessage(err);
        console.error("[ai-writing] stream failed:", cleanMessage);
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
exports.saveDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    const doc = await aiWritingService.saveDocument(req.user.id, req.body);
    return res.status(201).json({
        document: doc,
    });
});
exports.getDocuments = (0, errors_1.asyncHandler)(async (req, res) => {
    const docs = await aiWritingService.getDocuments(req.user.id);
    return res.json({
        documents: docs,
    });
});
exports.deleteDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    await aiWritingService.deleteDocument(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.convertToNote = (0, errors_1.asyncHandler)(async (req, res) => {
    const note = await aiWritingService.convertToNote(req.user.id, req.params.id);
    return res.status(201).json({
        note,
    });
});
