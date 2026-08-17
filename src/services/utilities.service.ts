import { redis } from "../config/redis";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

const TTL_SECONDS = 6 * 60 * 60;

export async function getExchangeRates(base: string) {
  const cacheKey = `fx:${base}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();

  await redis.set(cacheKey, JSON.stringify(data), "EX", TTL_SECONDS);
  return data;
}


const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function translateText(text: string, targetLanguage: string) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: `Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else:\n\n${text}` }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}