"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamAssistantReply = streamAssistantReply;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const env_1 = require("../config/env");
const ai_context_service_1 = require("./ai-context.service");
const anthropic = new sdk_1.default({ apiKey: env_1.env.ANTHROPIC_API_KEY });
function buildSystemPrompt(userName, context) {
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
function streamAssistantReply(userId, userName, message, onDelta) {
    return (0, ai_context_service_1.getAIContext)(userId).then((context) => {
        const systemPrompt = buildSystemPrompt(userName, context);
        return new Promise((resolve, reject) => {
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
