import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { streamPrompt } from "../lib/ai-provider";
import * as noteService from "./note.service";

type Options = { tone?: string; targetLanguage?: string };

const toneLine = (tone?: string) => (tone ? `\nUse a ${tone.toLowerCase()} tone.` : "");

const PROMPTS: Record<string, (input: string, options: Options) => string> = {
  GENERATE: (input, o) => `Write the following.${toneLine(o.tone)}\n\n${input}`,
  REWRITE: (input, o) => `Rewrite this text in different words, keeping the meaning, intent and every important detail.${toneLine(o.tone)}\n\n${input}`,
  IMPROVE: (input) => `Fix the grammar, spelling, punctuation and clarity of this text. Keep the meaning and the writer's voice. Add nothing new.\n\n${input}`,
  SHORTEN: (input) => `Make this text at least 30% shorter while keeping the key facts and intent.\n\n${input}`,
  EXPAND: (input) => `Expand this text with useful detail, examples and explanation. Keep the original meaning and intent.\n\n${input}`,
  SUMMARIZE: (input) => `Summarize this text into its most important points. Be concise.\n\n${input}`,
  TRANSLATE: (input, o) => `Translate this text into ${o.targetLanguage || "English"}. Preserve the meaning, tone and formatting.\n\n${input}`,
  TONE_CHANGE: (input, o) => `Rewrite this text in a ${(o.tone || "professional").toLowerCase()} tone. Keep the meaning and every important detail.\n\n${input}`,
};

const SYSTEM = [
  "You are the LifeOS writing assistant. You generate, rewrite, improve, summarize, translate, shorten and expand text.",
  "Follow the requested mode exactly and preserve the user's meaning.",
  "Do not invent facts unless asked to write fictional or creative content.",
  "Write plain text. Do not use Markdown symbols such as asterisks or pound signs.",
  "Return only the requested writing, with no introduction or closing remarks.",
].join("\n");

export async function streamWriting(
  mode: string,
  input: string,
  options: Options,
  onDelta: (text: string) => void,
  isAborted?: () => boolean
) {
  const build = PROMPTS[mode.toUpperCase()] ?? PROMPTS.GENERATE;
  await streamPrompt({ system: SYSTEM, prompt: build(input, options), onDelta, isAborted });
}

export async function saveDocument(
  userId: string,
  data: { title: string; mode: string; input: string; output: string; tone?: string }
) {
  return prisma.writingDocument.create({
    data: {
      userId,
      title: data.title.trim(),
      mode: data.mode as "EXPAND" | "SUMMARIZE" | "TRANSLATE" | "TONE_CHANGE" | "GENERATE" | "REWRITE" | "IMPROVE" | "SHORTEN",
      input: data.input,
      output: data.output,
      tone: data.tone ?? null,
    },
  });
}

export async function getDocuments(userId: string) {
  return prisma.writingDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function deleteDocument(userId: string, documentId: string) {
  const result = await prisma.writingDocument.deleteMany({ where: { id: documentId, userId } });
  if (result.count === 0) throw new AppError("Writing document not found", 404);
}

export async function convertToNote(userId: string, documentId: string) {
  const document = await prisma.writingDocument.findFirst({ where: { id: documentId, userId } });
  if (!document) throw new AppError("Writing document not found", 404);
  return noteService.createNote(userId, { title: document.title, content: document.output, folder: "Personal" });
}