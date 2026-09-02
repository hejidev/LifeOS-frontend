import { redis } from "../config/redis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const TTL_SECONDS = 6 * 60 * 60;

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-3.6-flash";

export async function getExchangeRates(base: string) {
  const cacheKey = `fx:${base.toUpperCase()}`;

  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(
      base.toUpperCase()
    )}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const data = await res.json();

  await redis.set(
    cacheKey,
    JSON.stringify(data),
    "EX",
    TTL_SECONDS
  );

  return data;
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