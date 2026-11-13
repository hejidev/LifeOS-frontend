"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExchangeRates = getExchangeRates;
exports.translateText = translateText;
const redis_1 = require("../config/redis");
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const TTL_SECONDS = 6 * 60 * 60;
const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-3.6-flash";
async function getExchangeRates(base) {
    const code = base.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code))
        throw new errors_1.AppError("Invalid currency code", 400);
    const cacheKey = `fx:v2:${code}`;
    const cached = await redis_1.redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const res = await fetch(`https://open.er-api.com/v6/latest/${code}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok)
        throw new errors_1.AppError("Couldn't fetch exchange rates right now", 502);
    const data = await res.json();
    if (data.result !== "success")
        throw new errors_1.AppError("Exchange rates are unavailable right now", 502);
    const payload = {
        base: data.base_code,
        date: data.time_last_update_utc,
        rates: data.rates,
    };
    await redis_1.redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
    return payload;
}
async function translateText(text, targetLanguage) {
    if (!text?.trim()) {
        return "";
    }
    if (!targetLanguage?.trim()) {
        throw new Error("Target language is required");
    }
    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `
You are a professional translation assistant.

Translate the user's text into the requested target language.

Rules:
- Return ONLY the translated text.
- Do not add explanations.
- Do not add introductions.
- Do not add quotation marks unless they are part of the original text.
- Preserve the original meaning.
- Preserve the original tone.
- Preserve paragraph breaks and formatting where possible.
`.trim(),
    });
    try {
        const prompt = `
Target language: ${targetLanguage}

Text to translate:

${text}
`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    }
    catch (error) {
        console.error("[translation] Gemini error:", error?.message ?? error);
        throw error;
    }
}
