import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as noteService from "./note.service";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const MODE_PROMPTS: Record<string, (input: string, opts: any) => string> = {
  GENERATE: (input) => `Write the following:\n\n${input}`,
  REWRITE: (input) => `Rewrite the following text in different words while keeping the same meaning:\n\n${input}`,
  IMPROVE: (input) => `Fix grammar, spelling, and clarity issues in the following text without changing its meaning or voice:\n\n${input}`,
  SHORTEN: (input) => `Make the following text more concise, cutting at least 30% of the length without losing key meaning:\n\n${input}`,
  EXPAND: (input) => `Expand the following text with more detail, examples, and depth:\n\n${input}`,
  SUMMARIZE: (input) => `Summarize the following text into the key points:\n\n${input}`,
  TRANSLATE: (input, opts) => `Translate the following text to ${opts.targetLanguage || "Spanish"}, preserving tone and meaning:\n\n${input}`,
  TONE_CHANGE: (input, opts) => `Rewrite the following text in a ${opts.tone || "professional"} tone:\n\n${input}`,
};

export function streamWriting(
  mode: string,
  input: string,
  opts: { tone?: string; targetLanguage?: string },
  onDelta: (text: string) => void
): Promise<void> {
  const promptFn = MODE_PROMPTS[mode] ?? MODE_PROMPTS.GENERATE;
  const prompt = promptFn(input, opts);

  return new Promise((resolve, reject) => {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    stream.on("text", (delta) => onDelta(delta));
    stream.on("error", (err) => reject(err));
    stream.finalMessage().then(() => resolve()).catch(reject);
  });
}

export async function saveDocument(userId: string, data: { title: string; mode: string; input: string; output: string; tone?: string }) {
  return prisma.writingDocument.create({ data: { userId, ...data } as any });
}

export async function getDocuments(userId: string) {
  return prisma.writingDocument.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function deleteDocument(userId: string, id: string) {
  const existing = await prisma.writingDocument.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Document not found", 404);
  await prisma.writingDocument.delete({ where: { id } });
}

export async function convertToNote(userId: string, documentId: string) {
  const doc = await prisma.writingDocument.findFirst({ where: { id: documentId, userId } });
  if (!doc) throw new AppError("Document not found", 404);
  return noteService.createNote(userId, { title: doc.title, content: doc.output, folder: "Personal" });
}