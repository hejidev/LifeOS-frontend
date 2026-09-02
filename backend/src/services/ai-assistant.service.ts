import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { getAIContext } from "./ai-context.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-3.6-flash";

function buildSystemPrompt(
  userName: string,
  context: Awaited<ReturnType<typeof getAIContext>>
) {
  const lines = [
    `You are the LifeOS AI Assistant, helping ${userName} manage their day.`,

    "Be concise, warm, practical, and specific.",

    "Only reference the real data provided below.",
    "Never invent tasks, notes, financial numbers, events, or other personal information.",
    "If the information is not available, say that you don't have that information.",

    "",

    `Today's tasks (${context.todayTasks.length}):`,

    ...(context.todayTasks.length
      ? context.todayTasks.map(
          (t) =>
            `- ${t.title} (${t.priority})${
              t.dueTime ? ` at ${t.dueTime}` : ""
            }`
        )
      : ["- none"]),

    "",

    `Overdue tasks (${context.overdueTasks.length}):`,

    ...(context.overdueTasks.length
      ? context.overdueTasks.map(
          (t) =>
            `- ${t.title} (${t.priority})${
              t.dueDate ? ` — due ${t.dueDate}` : ""
            }`
        )
      : ["- none"]),

    "",

    `Recent notes: ${
      context.recentNotes.map((n) => n.title).join(", ") || "none"
    }`,

    "",

    `Finance this month: spent $${context.finance.totalSpent} of $${context.finance.monthlyBudget} budget.${
      context.finance.insight
        ? ` ${context.finance.insight}`
        : ""
    }`,

    "",

    `Today's calendar events (${context.todayEvents.length}):`,

    ...(context.todayEvents.length
      ? context.todayEvents.map(
          (event) =>
            `- ${event.title} (${event.start} - ${event.end})`
        )
      : ["- none"]),
  ];

  return lines.join("\n");
}

export async function streamAssistantReply(
  userId: string,
  userName: string,
  message: string,
  onDelta: (text: string) => void
): Promise<void> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  if (!message?.trim()) {
    throw new Error("Message is required");
  }

  const context = await getAIContext(userId);

  const systemPrompt = buildSystemPrompt(userName, context);

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,

      systemInstruction: systemPrompt,
    });

    const result = await model.generateContentStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();

      if (text) {
        onDelta(text);
      }
    }
  } catch (error: any) {
    console.error(
      "[ai-assistant] Gemini error:",
      error?.message ?? error
    );

    throw error;
  }
}