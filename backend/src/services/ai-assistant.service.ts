import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { streamChat, type ChatTurn } from "../lib/ai-provider";
import { consumeLimit } from "../lib/rate-limit";
import { buildAssistantPrompt, getAssistantContext } from "./assistant-context.service";

const HISTORY_LIMIT = 20;
const MAX_MESSAGES = 200;
const MAX_CONVERSATIONS = 100;

async function createConversation(userId: string, firstMessage: string) {
  const count = await prisma.assistantConversation.count({ where: { userId } });
  if (count >= MAX_CONVERSATIONS) {
    const oldest = await prisma.assistantConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "asc" },
      take: count - MAX_CONVERSATIONS + 1,
      select: { id: true },
    });
    await prisma.assistantConversation.deleteMany({ where: { id: { in: oldest.map((item) => item.id) } } });
  }
  return prisma.assistantConversation.create({
    data: { userId, title: firstMessage.replace(/\s+/g, " ").slice(0, 60) || "New chat" },
    select: { id: true },
  });
}

export async function listConversations(userId: string) {
  const rows = await prisma.assistantConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString() }));
}

export async function getConversation(userId: string, id: string) {
  const conversation = await prisma.assistantConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: MAX_MESSAGES } },
  });
  if (!conversation) throw new AppError("Conversation not found", 404);

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

export async function deleteConversation(userId: string, id: string) {
  const result = await prisma.assistantConversation.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new AppError("Conversation not found", 404);
}

export async function streamAssistantReply(input: {
  userId: string;
  message: string;
  conversationId?: string;
  isAborted: () => boolean;
  onStart: (conversationId: string) => void;
  onDelta: (text: string) => void;
}) {
  const { userId, message } = input;
  const hourly = Number(process.env.AI_HOURLY_LIMIT) || 30;
  const daily = Number(process.env.AI_DAILY_LIMIT) || 150;
  await consumeLimit(`rl:assistant:h:${userId}`, hourly, 3600, "You've reached the hourly assistant limit.");
  await consumeLimit(`rl:assistant:d:${userId}`, daily, 86_400, "You've reached today's assistant limit.");

  let conversation: { id: string } | null = null;
  let history: ChatTurn[] = [];

  if (input.conversationId) {
    conversation = await prisma.assistantConversation.findFirst({ where: { id: input.conversationId, userId }, select: { id: true } });
    if (!conversation) throw new AppError("Conversation not found", 404);

    const total = await prisma.assistantMessage.count({ where: { conversationId: conversation.id } });
    if (total >= MAX_MESSAGES) throw new AppError("This conversation is full. Start a new chat.", 400);

    const stored = await prisma.assistantMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });
    history = stored.reverse().map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content }));
  }

  const system = buildAssistantPrompt(await getAssistantContext(userId));

  let created = false;
  if (!conversation) {
    conversation = await createConversation(userId, message);
    created = true;
  }
  const conversationId = conversation.id;

  const discard = () => (created ? prisma.assistantConversation.delete({ where: { id: conversationId } }).catch(() => undefined) : Promise.resolve());

  let reply = "";
  let announced = false;
  const forward = (text: string) => {
    if (!announced) {
      announced = true;
      input.onStart(conversationId);
    }
    reply += text;
    input.onDelta(text);
  };

  try {
    await streamChat({ system, history, message, isAborted: input.isAborted, onDelta: forward });
  } catch (error) {
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
  await prisma.$transaction([
    prisma.assistantMessage.createMany({
      data: [
        { conversationId, role: "user", content: message, createdAt: askedAt },
        { conversationId, role: "assistant", content: reply.trim(), createdAt: new Date(askedAt.getTime() + 1) },
      ],
    }),
    prisma.assistantConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
}