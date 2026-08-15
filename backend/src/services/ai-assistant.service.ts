import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { getAIContext } from "./ai-context.service";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

function buildSystemPrompt(userName: string, context: Awaited<ReturnType<typeof getAIContext>>) {
  const lines = [
    `You are the LifeOS AI Assistant, helping ${userName} manage their day. Be concise, warm, and specific. Only reference the real data listed below — never invent tasks, notes, or numbers that aren't listed here.`,
    "",
    `Today's tasks (${context.todayTasks.length}):`,
    ...(context.todayTasks.length ? context.todayTasks.map((t) => `- ${t.title} (${t.priority})`) : ["- none"]),
    "",
    `Overdue tasks (${context.overdueTasks.length}):`,
    ...(context.overdueTasks.length ? context.overdueTasks.map((t) => `- ${t.title} (${t.priority})`) : ["- none"]),
    "",
    `Recent notes: ${context.recentNotes.map((n) => n.title).join(", ") || "none"}`,
    "",
    `Finance this month: spent $${context.finance.totalSpent} of $${context.finance.monthlyBudget} budget.${context.finance.insight ? " " + context.finance.insight : ""}`,
  ];
  return lines.join("\n");
}

export function streamAssistantReply(
  userId: string,
  userName: string,
  message: string,
  onDelta: (text: string) => void
): Promise<void> {
  return getAIContext(userId).then((context) => {
    const systemPrompt = buildSystemPrompt(userName, context);

    return new Promise<void>((resolve, reject) => {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      });

      stream.on("text", (delta) => onDelta(delta));
      stream.on("error", (err) => reject(err));
      stream.finalMessage().then(() => resolve()).catch(reject);
    });
  });
}