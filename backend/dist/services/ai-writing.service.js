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
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const noteService = __importStar(require("./note.service"));
const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-3.6-flash";
const MODE_PROMPTS = {
    GENERATE: (input) => `
Write the following:

${input}
`,
    REWRITE: (input) => `
Rewrite the following text using different words while keeping the same meaning, intent, and important details:

${input}
`,
    IMPROVE: (input) => `
Improve the following text by fixing grammar, spelling, punctuation, clarity, and readability.

Keep the original meaning, personality, and voice. Do not add unnecessary information.

Text:

${input}
`,
    SHORTEN: (input) => `
Make the following text more concise.

Reduce the length by at least 30% while preserving the important meaning, facts, and intent.

Text:

${input}
`,
    EXPAND: (input) => `
Expand the following text with useful detail, examples, explanation, and depth.

Keep the original meaning and intent.

Text:

${input}
`,
    SUMMARIZE: (input) => `
Summarize the following text into the most important points.

Be concise and preserve the key information.

Text:

${input}
`,
    TRANSLATE: (input, opts) => `
Translate the following text into ${opts.targetLanguage || "Spanish"}.

Preserve the original meaning, tone, context, and formatting as much as possible.

Text:

${input}
`,
    TONE_CHANGE: (input, opts) => `
Rewrite the following text using a ${opts.tone || "professional"} tone.

Preserve the original meaning and important details.

Text:

${input}
`,
};
async function streamWriting(mode, input, opts, onDelta) {
    if (!env_1.env.GEMINI_API_KEY) {
        throw new errors_1.AppError("Gemini API key is not configured");
    }
    if (!input?.trim()) {
        throw new errors_1.AppError("Input text is required");
    }
    const promptFn = MODE_PROMPTS[mode?.toUpperCase()] ?? MODE_PROMPTS.GENERATE;
    const prompt = promptFn(input, opts || {});
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: `
You are LifeOS AI Writer.

Your job is to help users generate, rewrite, improve, summarize,
translate, shorten, and expand written content.

Rules:
- Follow the requested writing mode.
- Preserve the user's intended meaning.
- Do not invent facts unless the user explicitly asks you to generate fictional content.
- Return only the requested writing.
- Do not add unnecessary introductions such as "Sure!" or "Here is the rewritten version."
      `.trim(),
        });
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                onDelta(text);
            }
        }
    }
    catch (error) {
        console.error("[ai-writing] Gemini error:", error?.message ?? error);
        throw error;
    }
}
/**
 * Save an AI-generated writing document
 */
async function saveDocument(userId, data) {
    if (!userId) {
        throw new errors_1.AppError("Authentication required");
    }
    if (!data.title?.trim()) {
        throw new errors_1.AppError("Document title is required");
    }
    if (!data.output?.trim()) {
        throw new errors_1.AppError("Document output is required");
    }
    return prisma_1.prisma.writingDocument.create({
        data: {
            userId,
            title: data.title.trim(),
            mode: data.mode,
            input: data.input || "",
            output: data.output,
            tone: data.tone || null,
        },
    });
}
/**
 * Get user's saved AI writing documents
 */
async function getDocuments(userId) {
    if (!userId) {
        throw new errors_1.AppError("Authentication required");
    }
    return prisma_1.prisma.writingDocument.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
/**
 * Delete an AI writing document
 */
async function deleteDocument(userId, documentId) {
    if (!userId) {
        throw new errors_1.AppError("Authentication required");
    }
    const document = await prisma_1.prisma.writingDocument.findFirst({
        where: {
            id: documentId,
            userId,
        },
    });
    if (!document) {
        throw new errors_1.AppError("Writing document not found");
    }
    await prisma_1.prisma.writingDocument.delete({
        where: {
            id: documentId,
        },
    });
}
/**
 * Convert a saved AI document into a LifeOS note
 */
async function convertToNote(userId, documentId) {
    if (!userId) {
        throw new errors_1.AppError("Authentication required");
    }
    const document = await prisma_1.prisma.writingDocument.findFirst({
        where: {
            id: documentId,
            userId,
        },
    });
    if (!document) {
        throw new errors_1.AppError("Writing document not found");
    }
    const note = await noteService.createNote(userId, {
        title: document.title,
        content: document.output,
    });
    return note;
}
