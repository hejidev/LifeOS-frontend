"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExchangeRates = getExchangeRates;
exports.translateText = translateText;
const redis_1 = require("../config/redis");
const errors_1 = require("../lib/errors");
const ai_provider_1 = require("../lib/ai-provider");
const TTL_SECONDS = 6 * 60 * 60;
async function loadRates(code) {
    const cacheKey = `fx:v2:${code}`;
    const cached = await redis_1.redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const res = await fetch(`https://open.er-api.com/v6/latest/${code}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok)
        throw new errors_1.AppError("Couldn't fetch exchange rates right now", 502);
    const data = (await res.json());
    if (data.result !== "success" || !data.rates)
        throw new errors_1.AppError("Exchange rates are unavailable right now", 502);
    const payload = { base: data.base_code ?? code, date: data.time_last_update_utc ?? null, rates: data.rates };
    await redis_1.redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
    return payload;
}
async function getExchangeRates(base) {
    const code = base.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code))
        throw new errors_1.AppError("Invalid currency code", 400);
    if (code !== "USD") {
        const usd = await loadRates("USD");
        if (!(code in usd.rates))
            throw new errors_1.AppError("That currency isn't supported", 400);
    }
    return loadRates(code);
}
const TRANSLATE_SYSTEM = [
    "You are a professional translation assistant.",
    "Translate the user's text into the requested target language.",
    "Return only the translated text, with no explanations, introductions or added quotation marks.",
    "Preserve the meaning, tone, paragraph breaks and formatting.",
].join("\n");
async function translateText(text, targetLanguage) {
    return (0, ai_provider_1.completeText)({ system: TRANSLATE_SYSTEM, prompt: `Target language: ${targetLanguage}\n\nText to translate:\n\n${text}` });
}
