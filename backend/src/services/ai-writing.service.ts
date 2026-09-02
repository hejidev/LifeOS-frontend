import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as noteService from "./note.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-3.6-flash";

const MODE_PROMPTS: Record<
  string,
  (input: string, opts: { tone?: string; targetLanguage?: string }) => string
> = {
  GENERATE: (input) => `
Write the following:

${input}
`,

  REWRITE: (input) => `
Rewrite the following text using different words while keeping the same meaning, intent, and important details:

${input}
`,

  IMPROVE: (input) => `
Improve the following text by fixing grammar, spelling, punctuation, clarity, and readability.

Keep the original meaning, personality, and voice. Do not add unnecessary information.

Text:

${input}
`,

  SHORTEN: (input) => `
Make the following text more concise.

Reduce the length by at least 30% while preserving the important meaning, facts, and intent.

Text:

${input}
`,

  EXPAND: (input) => `
Expand the following text with useful detail, examples, explanation, and depth.

Keep the original meaning and intent.

Text:

${input}
`,

  SUMMARIZE: (input) => `
Summarize the following text into the most important points.

Be concise and preserve the key information.

Text:

${input}
`,

  TRANSLATE: (input, opts) => `
Translate the following text into ${
    opts.targetLanguage || "Spanish"
  }.

Preserve the original meaning, tone, context, and formatting as much as possible.

Text:

${input}
`,

  TONE_CHANGE: (input, opts) => `
Rewrite the following text using a ${
    opts.tone || "professional"
  } tone.

Preserve the original meaning and important details.

Text:

${input}
`,
};

export async function streamWriting(
  mode: string,
  input: string,
  opts: { tone?: string; targetLanguage?: string },
  onDelta: (text: string) => void
): Promise<void> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("Gemini API key is not configured");
  }

  if (!input?.trim()) {
    throw new AppError("Input text is required");
  }

  const promptFn =
    MODE_PROMPTS[mode?.toUpperCase()] ?? MODE_PROMPTS.GENERATE;

  const prompt = promptFn(input, opts || {});

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `
You are LifeOS AI Writer.

Your job is to help users generate, rewrite, improve, summarize,
translate, shorten, and expand written content.

Rules:
- Follow the requested writing mode.
- Preserve the user's intended meaning.
- Do not invent facts unless the user explicitly asks you to generate fictional content.
- Return only the requested writing.
- Do not add unnecessary introductions such as "Sure!" or "Here is the rewritten version."
      `.trim(),
    });

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();

      if (text) {
        onDelta(text);
      }
    }
  } catch (error: any) {
    console.error(
      "[ai-writing] Gemini error:",
      error?.message ?? error
    );

    throw error;
  }
}

/**
 * Save an AI-generated writing document
 */
export async function saveDocument(
  userId: string,
  data: {
    title: string;
    mode: string;
    input: string;
    output: string;
    tone?: string;
  }
) {
  if (!userId) {
    throw new AppError("Authentication required");
  }

  if (!data.title?.trim()) {
    throw new AppError("Document title is required");
  }

  if (!data.output?.trim()) {
    throw new AppError("Document output is required");
  }

  return prisma.writingDocument.create({
    data: {
      userId,
      title: data.title.trim(),
      mode: data.mode as "EXPAND" | "SUMMARIZE" | "TRANSLATE" | "TONE_CHANGE" | "GENERATE" | "REWRITE" | "IMPROVE" | "SHORTEN",
      input: data.input || "",
      output: data.output,
      tone: data.tone || null,
    },
  });
}

/**
 * Get user's saved AI writing documents
 */
export async function getDocuments(userId: string) {
  if (!userId) {
    throw new AppError("Authentication required");
  }

  return prisma.writingDocument.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Delete an AI writing document
 */
export async function deleteDocument(
  userId: string,
  documentId: string
) {
  if (!userId) {
    throw new AppError("Authentication required");
  }

  const document = await prisma.writingDocument.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  if (!document) {
    throw new AppError("Writing document not found");
  }

  await prisma.writingDocument.delete({
    where: {
      id: documentId,
    },
  });
}

/**
 * Convert a saved AI document into a LifeOS note
 */
export async function convertToNote(
  userId: string,
  documentId: string
) {
  if (!userId) {
    throw new AppError("Authentication required");
  }

  const document = await prisma.writingDocument.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  if (!document) {
    throw new AppError("Writing document not found");
  }

  const note = await noteService.createNote(userId, {
    title: document.title,
    content: document.output,
  });

  return note;
}