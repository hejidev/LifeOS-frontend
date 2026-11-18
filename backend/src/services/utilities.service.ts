import { redis } from "../config/redis";
import { AppError } from "../lib/errors";
import { completeText } from "../lib/ai-provider";

const TTL_SECONDS = 6 * 60 * 60;

interface ExchangeRateResponse {
  result?: string;
  base_code?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
}

interface RatePayload {
  base: string;
  date: string | null;
  rates: Record<string, number>;
}

async function loadRates(code: string): Promise<RatePayload> {
  const cacheKey = `fx:v2:${code}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as RatePayload;

  const res = await fetch(`https://open.er-api.com/v6/latest/${code}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new AppError("Couldn't fetch exchange rates right now", 502);

  const data = (await res.json()) as ExchangeRateResponse;
  if (data.result !== "success" || !data.rates) throw new AppError("Exchange rates are unavailable right now", 502);

  const payload: RatePayload = { base: data.base_code ?? code, date: data.time_last_update_utc ?? null, rates: data.rates };
  await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
  return payload;
}

export async function getExchangeRates(base: string) {
  const code = base.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new AppError("Invalid currency code", 400);

  if (code !== "USD") {
    const usd = await loadRates("USD");
    if (!(code in usd.rates)) throw new AppError("That currency isn't supported", 400);
  }
  return loadRates(code);
}

const TRANSLATE_SYSTEM = [
  "You are a professional translation assistant.",
  "Translate the user's text into the requested target language.",
  "Return only the translated text, with no explanations, introductions or added quotation marks.",
  "Preserve the meaning, tone, paragraph breaks and formatting.",
].join("\n");

export async function translateText(text: string, targetLanguage: string) {
  return completeText({ system: TRANSLATE_SYSTEM, prompt: `Target language: ${targetLanguage}\n\nText to translate:\n\n${text}` });
}