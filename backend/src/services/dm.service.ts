import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { getIO } from "../sockets/io-instance";
import { createNotification } from "./notification.service";

function normalizePair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function getOrCreateConversation(userA: string, userB: string) {
  const [participantAId, participantBId] = normalizePair(userA, userB);
  let convo = await prisma.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId, participantBId } },
  });
  if (!convo) convo = await prisma.conversation.create({ data: { participantAId, participantBId } });
  return convo;
}

export async function getConversationOrThrow(userId: string, conversationId: string) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo || (convo.participantAId !== userId && convo.participantBId !== userId)) {
    throw new AppError("Conversation not found", 404);
  }
  return convo;
}

export async function sendMessage(senderId: string, recipientId: string, body: string) {
  const convo = await getOrCreateConversation(senderId, recipientId);
  const message = await prisma.message.create({ data: { conversationId: convo.id, senderId, body } });
  await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
  const actionUrl =
    recipient?.role === "SUPER_ADMIN" ? `/super-admin/messages?conversation=${convo.id}` :
    recipient?.role === "ADMIN" ? `/admin/messages?conversation=${convo.id}` :
    "/app/contact";

  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit("message:new", {
      conversationId: convo.id, id: message.id, senderId, body, createdAt: message.createdAt.toISOString(),
    });
  }

  await createNotification(recipientId, {
    type: "INFO",
    title: "New message",
    message: body.length > 80 ? `${body.slice(0, 80)}...` : body,
    actionUrl,
  });

  return message;
}

export async function listConversations(userId: string) {
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
    include: {
      participantA: { select: { id: true, name: true, email: true, role: true } },
      participantB: { select: { id: true, name: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return convos.map((c) => {
    const other = c.participantAId === userId ? c.participantB : c.participantA;
    return { id: c.id, participant: other, lastMessage: c.messages[0]?.body ?? null, lastMessageAt: c.lastMessageAt.toISOString() };
  });
}

export async function getMessages(userId: string, conversationId: string) {
  await getConversationOrThrow(userId, conversationId);

  const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  await prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, read: false }, data: { read: true } });

  return messages;
}

export async function getSupportRecipientId() {
  const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" as any }, orderBy: { createdAt: "asc" } });
  if (superAdmin) return superAdmin.id;
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" as any }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new AppError("No support team available right now", 503);
  return admin.id;
}

export async function contactSupport(userId: string, message: string) {
  const recipientId = await getSupportRecipientId();
  if (recipientId === userId) throw new AppError("You can't message yourself", 400);
  return sendMessage(userId, recipientId, message);
}