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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamWriting = streamWriting;
exports.saveDocument = saveDocument;
exports.getDocuments = getDocuments;
exports.deleteDocument = deleteDocument;
exports.convertToNote = convertToNote;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const noteService = __importStar(require("./note.service"));
const anthropic = new sdk_1.default({ apiKey: env_1.env.ANTHROPIC_API_KEY });
const MODE_PROMPTS = {
    GENERATE: (input) => `Write the following:\n\n${input}`,
    REWRITE: (input) => `Rewrite the following text in different words while keeping the same meaning:\n\n${input}`,
    IMPROVE: (input) => `Fix grammar, spelling, and clarity issues in the following text without changing its meaning or voice:\n\n${input}`,
    SHORTEN: (input) => `Make the following text more concise, cutting at least 30% of the length without losing key meaning:\n\n${input}`,
    EXPAND: (input) => `Expand the following text with more detail, examples, and depth:\n\n${input}`,
    SUMMARIZE: (input) => `Summarize the following text into the key points:\n\n${input}`,
    TRANSLATE: (input, opts) => `Translate the following text to ${opts.targetLanguage || "Spanish"}, preserving tone and meaning:\n\n${input}`,
    TONE_CHANGE: (input, opts) => `Rewrite the following text in a ${opts.tone || "professional"} tone:\n\n${input}`,
};
function streamWriting(mode, input, opts, onDelta) {
    const promptFn = MODE_PROMPTS[mode] ?? MODE_PROMPTS.GENERATE;
    const prompt = promptFn(input, opts);
    return new Promise((resolve, reject) => {
        const stream = anthropic.messages.stream({
            model: "claude-sonnet-5",
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
        });
        stream.on("text", (delta) => onDelta(delta));
        stream.on("error", (err) => reject(err));
        stream.finalMessage().then(() => resolve()).catch(reject);
    });
}
async function saveDocument(userId, data) {
    return prisma_1.prisma.writingDocument.create({ data: { userId, ...data } });
}
async function getDocuments(userId) {
    return prisma_1.prisma.writingDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
async function deleteDocument(userId, id) {
    const existing = await prisma_1.prisma.writingDocument.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Document not found", 404);
    await prisma_1.prisma.writingDocument.delete({ where: { id } });
}
async function convertToNote(userId, documentId) {
    const doc = await prisma_1.prisma.writingDocument.findFirst({ where: { id: documentId, userId } });
    if (!doc)
        throw new errors_1.AppError("Document not found", 404);
    return noteService.createNote(userId, { title: doc.title, content: doc.output, folder: "Personal" });
}
