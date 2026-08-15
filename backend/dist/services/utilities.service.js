"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExchangeRates = getExchangeRates;
exports.translateText = translateText;
const redis_1 = require("../config/redis");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const env_1 = require("../config/env");
const TTL_SECONDS = 6 * 60 * 60;
async function getExchangeRates(base) {
    const cacheKey = `fx:${base}`;
    const cached = await redis_1.redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
    if (!res.ok)
        throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    await redis_1.redis.set(cacheKey, JSON.stringify(data), "EX", TTL_SECONDS);
    return data;
}
const anthropic = new sdk_1.default({ apiKey: env_1.env.ANTHROPIC_API_KEY });
async function translateText(text, targetLanguage) {
    const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: `Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else:\n\n${text}` }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
}
