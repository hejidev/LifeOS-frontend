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
exports.streamWriting = streamWriting;
exports.saveDocument = saveDocument;
exports.getDocuments = getDocuments;
exports.deleteDocument = deleteDocument;
exports.convertToNote = convertToNote;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const ai_provider_1 = require("../lib/ai-provider");
const noteService = __importStar(require("./note.service"));
const toneLine = (tone) => (tone ? `\nUse a ${tone.toLowerCase()} tone.` : "");
const PROMPTS = {
    GENERATE: (input, o) => `Write the following.${toneLine(o.tone)}\n\n${input}`,
    REWRITE: (input, o) => `Rewrite this text in different words, keeping the meaning, intent and every important detail.${toneLine(o.tone)}\n\n${input}`,
    IMPROVE: (input) => `Fix the grammar, spelling, punctuation and clarity of this text. Keep the meaning and the writer's voice. Add nothing new.\n\n${input}`,
    SHORTEN: (input) => `Make this text at least 30% shorter while keeping the key facts and intent.\n\n${input}`,
    EXPAND: (input) => `Expand this text with useful detail, examples and explanation. Keep the original meaning and intent.\n\n${input}`,
    SUMMARIZE: (input) => `Summarize this text into its most important points. Be concise.\n\n${input}`,
    TRANSLATE: (input, o) => `Translate this text into ${o.targetLanguage || "English"}. Preserve the meaning, tone and formatting.\n\n${input}`,
    TONE_CHANGE: (input, o) => `Rewrite this text in a ${(o.tone || "professional").toLowerCase()} tone. Keep the meaning and every important detail.\n\n${input}`,
};
const SYSTEM = [
    "You are the LifeOS writing assistant. You generate, rewrite, improve, summarize, translate, shorten and expand text.",
    "Follow the requested mode exactly and preserve the user's meaning.",
    "Do not invent facts unless asked to write fictional or creative content.",
    "Write plain text. Do not use Markdown symbols such as asterisks or pound signs.",
    "Return only the requested writing, with no introduction or closing remarks.",
].join("\n");
async function streamWriting(mode, input, options, onDelta, isAborted) {
    const build = PROMPTS[mode.toUpperCase()] ?? PROMPTS.GENERATE;
    await (0, ai_provider_1.streamPrompt)({ system: SYSTEM, prompt: build(input, options), onDelta, isAborted });
}
async function saveDocument(userId, data) {
    return prisma_1.prisma.writingDocument.create({
        data: {
            userId,
            title: data.title.trim(),
            mode: data.mode,
            input: data.input,
            output: data.output,
            tone: data.tone ?? null,
        },
    });
}
async function getDocuments(userId) {
    return prisma_1.prisma.writingDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}
async function deleteDocument(userId, documentId) {
    const result = await prisma_1.prisma.writingDocument.deleteMany({ where: { id: documentId, userId } });
    if (result.count === 0)
        throw new errors_1.AppError("Writing document not found", 404);
}
async function convertToNote(userId, documentId) {
    const document = await prisma_1.prisma.writingDocument.findFirst({ where: { id: documentId, userId } });
    if (!document)
        throw new errors_1.AppError("Writing document not found", 404);
    return noteService.createNote(userId, { title: document.title, content: document.output, folder: "Personal" });
}
