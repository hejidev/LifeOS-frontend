import { redis } from "../config/redis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

const TTL_SECONDS = 6 * 60 * 60;

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-3.6-flash";

export async function getExchangeRates(base: string) {
  const code = base.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new AppError("Invalid currency code", 400);

  const cacheKey = `fx:v2:${code}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const res = await fetch(`https://open.er-api.com/v6/latest/${code}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new AppError("Couldn't fetch exchange rates right now", 502);

  const data = await res.json();
  if (data.result !== "success") throw new AppError("Exchange rates are unavailable right now", 502);

  const payload = {
    base: data.base_code,
    date: data.time_last_update_utc,
    rates: data.rates as Record<string, number>,
  };
  await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
  return payload;
}

export async function translateText(
  text: string,
  targetLanguage: string
) {
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
  } catch (error: any) {
    console.error(
      "[translation] Gemini error:",
      error?.message ?? error
    );

    throw error;
  }
}