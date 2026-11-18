"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendlyAiError = friendlyAiError;
exports.streamChat = streamChat;
exports.streamPrompt = streamPrompt;
exports.completeText = completeText;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const errors_1 = require("./errors");
const MODEL_NAME = process.env.AI_MODEL || "gemini-3.6-flash";
const STREAM_TIMEOUT_MS = 90000;
const client = env_1.env.GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY) : null;
function modelFor(system) {
    if (!client)
        throw new errors_1.AppError("The AI service isn't configured yet.", 503);
    return client.getGenerativeModel({ model: MODEL_NAME, systemInstruction: system }, { timeout: STREAM_TIMEOUT_MS });
}
function friendlyAiError(error) {
    if (error instanceof errors_1.AppError)
        return error;
    const raw = error;
    const text = String(raw?.message ?? "");
    console.error("[ai] provider error:", text.slice(0, 300));
    if (raw?.status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(text)) {
        return new errors_1.AppError("The AI service is busy right now. Please try again in a minute.", 503);
    }
    if (raw?.status === 401 || raw?.status === 403 || /API key/i.test(text)) {
        return new errors_1.AppError("The AI service isn't available right now.", 503);
    }
    if (/SAFETY|blocked/i.test(text))
        return new errors_1.AppError("I can't help with that request.", 422);
    return new errors_1.AppError("The AI service couldn't complete that request. Please try again.", 502);
}
function toHistory(turns) {
    const merged = [];
    for (const turn of turns) {
        const last = merged[merged.length - 1];
        if (last && last.role === turn.role)
            last.content += `\n\n${turn.content}`;
        else
            merged.push({ ...turn });
    }
    while (merged.length > 0 && merged[0].role !== "user")
        merged.shift();
    while (merged.length > 0 && merged[merged.length - 1].role !== "assistant")
        merged.pop();
    return merged.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] }));
}
async function pump(stream, onDelta, isAborted) {
    const deadline = Date.now() + STREAM_TIMEOUT_MS;
    let produced = false;
    for await (const chunk of stream) {
        if (isAborted?.() || Date.now() > deadline)
            break;
        const text = chunk.text();
        if (text) {
            produced = true;
            onDelta(text);
        }
    }
    return produced;
}
async function streamChat(input) {
    try {
        const chat = modelFor(input.system).startChat({ history: toHistory(input.history) });
        const result = await chat.sendMessageStream(input.message);
        const produced = await pump(result.stream, input.onDelta, input.isAborted);
        if (!produced && !input.isAborted?.())
            throw new errors_1.AppError("I couldn't produce a reply to that. Try rephrasing.", 422);
    }
    catch (error) {
        throw friendlyAiError(error);
    }
}
async function streamPrompt(input) {
    try {
        const result = await modelFor(input.system).generateContentStream(input.prompt);
        const produced = await pump(result.stream, input.onDelta, input.isAborted);
        if (!produced && !input.isAborted?.())
            throw new errors_1.AppError("The AI returned nothing for that input. Try rephrasing.", 422);
    }
    catch (error) {
        throw friendlyAiError(error);
    }
}
async function completeText(input) {
    try {
        const result = await modelFor(input.system).generateContent(input.prompt);
        const text = result.response.text().trim();
        if (!text)
            throw new errors_1.AppError("The AI returned nothing for that input. Try rephrasing.", 422);
        return text;
    }
    catch (error) {
        throw friendlyAiError(error);
    }
}
