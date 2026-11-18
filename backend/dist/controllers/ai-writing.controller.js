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
exports.convertToNote = exports.deleteDocument = exports.getDocuments = exports.saveDocument = exports.streamWritingHandler = void 0;
const errors_1 = require("../lib/errors");
const aiWritingService = __importStar(require("../services/ai-writing.service"));
exports.streamWritingHandler = (0, errors_1.asyncHandler)(async (req, res) => {
    const { mode, input, tone, targetLanguage } = req.body;
    let aborted = false;
    let started = false;
    res.on("close", () => {
        if (!res.writableEnded)
            aborted = true;
    });
    try {
        await aiWritingService.streamWriting(mode, input, { tone, targetLanguage }, (chunk) => {
            if (!started) {
                started = true;
                res.status(200);
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("X-Accel-Buffering", "no");
            }
            res.write(chunk);
        }, () => aborted);
        res.end();
    }
    catch (error) {
        if (!started)
            throw error;
        res.end();
    }
});
exports.saveDocument = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json({ document: await aiWritingService.saveDocument(req.user.id, req.body) }));
exports.getDocuments = (0, errors_1.asyncHandler)(async (req, res) => res.json({ documents: await aiWritingService.getDocuments(req.user.id) }));
exports.deleteDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    await aiWritingService.deleteDocument(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.convertToNote = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json({ note: await aiWritingService.convertToNote(req.user.id, req.params.id) }));
