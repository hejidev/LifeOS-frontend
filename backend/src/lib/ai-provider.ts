import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { env } from "../config/env";
import { AppError } from "./errors";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const MODEL_NAME = process.env.AI_MODEL || "gemini-3.6-flash";
const STREAM_TIMEOUT_MS = 90_000;
const client = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

function modelFor(system: string): GenerativeModel {
  if (!client) throw new AppError("The AI service isn't configured yet.", 503);
  return client.getGenerativeModel({ model: MODEL_NAME, systemInstruction: system });
}

export function friendlyAiError(error: unknown) {
  if (error instanceof AppError) return error;
  const raw = error as { status?: number; message?: string };
  const text = String(raw?.message ?? "");
  console.error("[ai] provider error:", text.slice(0, 300));

  if (raw?.status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(text)) {
    return new AppError("The AI service is busy right now. Please try again in a minute.", 503);
  }
  if (raw?.status === 401 || raw?.status === 403 || /API key/i.test(text)) {
    return new AppError("The AI service isn't available right now.", 503);
  }
  if (/SAFETY|blocked/i.test(text)) return new AppError("I can't help with that request.", 422);
  return new AppError("The AI service couldn't complete that request. Please try again.", 502);
}

function toHistory(turns: ChatTurn[]) {
  const merged: ChatTurn[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) last.content += `\n\n${turn.content}`;
    else merged.push({ ...turn });
  }
  while (merged.length > 0 && merged[0].role !== "user") merged.shift();
  while (merged.length > 0 && merged[merged.length - 1].role !== "assistant") merged.pop();
  return merged.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] }));
}

async function pump(stream: AsyncIterable<{ text(): string }>, onDelta: (text: string) => void, isAborted?: () => boolean) {
  const deadline = Date.now() + STREAM_TIMEOUT_MS;
  let produced = false;
  for await (const chunk of stream) {
    if (isAborted?.() || Date.now() > deadline) break;
    const text = chunk.text();
    if (text) {
      produced = true;
      onDelta(text);
    }
  }
  return produced;
}

export async function streamChat(input: {
  system: string;
  history: ChatTurn[];
  message: string;
  onDelta: (text: string) => void;
  isAborted?: () => boolean;
}) {
  try {
    const chat = modelFor(input.system).startChat({ history: toHistory(input.history) });
    const result = await chat.sendMessageStream(input.message);
    const produced = await pump(result.stream, input.onDelta, input.isAborted);
    if (!produced && !input.isAborted?.()) throw new AppError("I couldn't produce a reply to that. Try rephrasing.", 422);
  } catch (error) {
    throw friendlyAiError(error);
  }
}

export async function streamPrompt(input: {
  system: string;
  prompt: string;
  onDelta: (text: string) => void;
  isAborted?: () => boolean;
}) {
  try {
    const result = await modelFor(input.system).generateContentStream(input.prompt);
    const produced = await pump(result.stream, input.onDelta, input.isAborted);
    if (!produced && !input.isAborted?.()) throw new AppError("The AI returned nothing for that input. Try rephrasing.", 422);
  } catch (error) {
    throw friendlyAiError(error);
  }
}