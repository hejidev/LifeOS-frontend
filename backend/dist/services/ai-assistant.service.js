"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversations = listConversations;
exports.getConversation = getConversation;
exports.deleteConversation = deleteConversation;
exports.streamAssistantReply = streamAssistantReply;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const ai_provider_1 = require("../lib/ai-provider");
const rate_limit_1 = require("../lib/rate-limit");
const assistant_context_service_1 = require("./assistant-context.service");
const HISTORY_LIMIT = 20;
const MAX_MESSAGES = 200;
const MAX_CONVERSATIONS = 100;
async function createConversation(userId, firstMessage) {
    const count = await prisma_1.prisma.assistantConversation.count({ where: { userId } });
    if (count >= MAX_CONVERSATIONS) {
        const oldest = await prisma_1.prisma.assistantConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "asc" },
            take: count - MAX_CONVERSATIONS + 1,
            select: { id: true },
        });
        await prisma_1.prisma.assistantConversation.deleteMany({ where: { id: { in: oldest.map((item) => item.id) } } });
    }
    return prisma_1.prisma.assistantConversation.create({
        data: { userId, title: firstMessage.replace(/\s+/g, " ").slice(0, 60) || "New chat" },
        select: { id: true },
    });
}
async function listConversations(userId) {
    const rows = await prisma_1.prisma.assistantConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, title: true, updatedAt: true },
    });
    return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString() }));
}
async function getConversation(userId, id) {
    const conversation = await prisma_1.prisma.assistantConversation.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: MAX_MESSAGES } },
    });
    if (!conversation)
        throw new errors_1.AppError("Conversation not found", 404);
    return {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages.map((message) => ({
            id: message.id,
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
            createdAt: message.createdAt.toISOString(),
        })),
    };
}
async function deleteConversation(userId, id) {
    const result = await prisma_1.prisma.assistantConversation.deleteMany({ where: { id, userId } });
    if (result.count === 0)
        throw new errors_1.AppError("Conversation not found", 404);
}
async function streamAssistantReply(input) {
    const { userId, message } = input;
    const hourly = Number(process.env.AI_HOURLY_LIMIT) || 30;
    const daily = Number(process.env.AI_DAILY_LIMIT) || 150;
    await (0, rate_limit_1.consumeLimit)(`rl:assistant:h:${userId}`, hourly, 3600, "You've reached the hourly assistant limit.");
    await (0, rate_limit_1.consumeLimit)(`rl:assistant:d:${userId}`, daily, 86400, "You've reached today's assistant limit.");
    let conversation = null;
    let history = [];
    if (input.conversationId) {
        conversation = await prisma_1.prisma.assistantConversation.findFirst({ where: { id: input.conversationId, userId }, select: { id: true } });
        if (!conversation)
            throw new errors_1.AppError("Conversation not found", 404);
        const total = await prisma_1.prisma.assistantMessage.count({ where: { conversationId: conversation.id } });
        if (total >= MAX_MESSAGES)
            throw new errors_1.AppError("This conversation is full. Start a new chat.", 400);
        const stored = await prisma_1.prisma.assistantMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
            take: HISTORY_LIMIT,
            select: { role: true, content: true },
        });
        history = stored.reverse().map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content }));
    }
    const system = (0, assistant_context_service_1.buildAssistantPrompt)(await (0, assistant_context_service_1.getAssistantContext)(userId));
    let created = false;
    if (!conversation) {
        conversation = await createConversation(userId, message);
        created = true;
    }
    const conversationId = conversation.id;
    const discard = () => (created ? prisma_1.prisma.assistantConversation.delete({ where: { id: conversationId } }).catch(() => undefined) : Promise.resolve());
    let reply = "";
    let announced = false;
    const forward = (text) => {
        if (!announced) {
            announced = true;
            input.onStart(conversationId);
        }
        reply += text;
        input.onDelta(text);
    };
    try {
        await (0, ai_provider_1.streamChat)({ system, history, message, isAborted: input.isAborted, onDelta: forward });
    }
    catch (error) {
        if (!reply) {
            await discard();
            throw error;
        }
    }
    if (!reply.trim()) {
        await discard();
        return;
    }
    const askedAt = new Date();
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.assistantMessage.createMany({
            data: [
                { conversationId, role: "user", content: message, createdAt: askedAt },
                { conversationId, role: "assistant", content: reply.trim(), createdAt: new Date(askedAt.getTime() + 1) },
            ],
        }),
        prisma_1.prisma.assistantConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);
}
