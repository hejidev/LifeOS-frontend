"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationOrThrow = getConversationOrThrow;
exports.sendMessage = sendMessage;
exports.listConversations = listConversations;
exports.getMessages = getMessages;
exports.getSupportRecipientId = getSupportRecipientId;
exports.contactSupport = contactSupport;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const io_instance_1 = require("../sockets/io-instance");
const notification_service_1 = require("./notification.service");
function normalizePair(a, b) {
    return a < b ? [a, b] : [b, a];
}
async function getOrCreateConversation(userA, userB) {
    const [participantAId, participantBId] = normalizePair(userA, userB);
    let convo = await prisma_1.prisma.conversation.findUnique({
        where: { participantAId_participantBId: { participantAId, participantBId } },
    });
    if (!convo)
        convo = await prisma_1.prisma.conversation.create({ data: { participantAId, participantBId } });
    return convo;
}
async function getConversationOrThrow(userId, conversationId) {
    const convo = await prisma_1.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo || (convo.participantAId !== userId && convo.participantBId !== userId)) {
        throw new errors_1.AppError("Conversation not found", 404);
    }
    return convo;
}
async function sendMessage(senderId, recipientId, body) {
    const convo = await getOrCreateConversation(senderId, recipientId);
    const message = await prisma_1.prisma.message.create({ data: { conversationId: convo.id, senderId, body } });
    await prisma_1.prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });
    const recipient = await prisma_1.prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    const actionUrl = recipient?.role === "SUPER_ADMIN" ? `/super-admin/messages?conversation=${convo.id}` :
        recipient?.role === "ADMIN" ? `/admin/messages?conversation=${convo.id}` :
            "/app/contact";
    const io = (0, io_instance_1.getIO)();
    if (io) {
        io.to(`user:${recipientId}`).emit("message:new", {
            conversationId: convo.id, id: message.id, senderId, body, createdAt: message.createdAt.toISOString(),
        });
    }
    await (0, notification_service_1.createNotification)(recipientId, {
        type: "INFO",
        title: "New message",
        message: body.length > 80 ? `${body.slice(0, 80)}...` : body,
        actionUrl,
    });
    return message;
}
async function listConversations(userId) {
    const convos = await prisma_1.prisma.conversation.findMany({
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
async function getMessages(userId, conversationId) {
    await getConversationOrThrow(userId, conversationId);
    const messages = await prisma_1.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    await prisma_1.prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, read: false }, data: { read: true } });
    return messages;
}
async function getSupportRecipientId() {
    const superAdmin = await prisma_1.prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, orderBy: { createdAt: "asc" } });
    if (superAdmin)
        return superAdmin.id;
    const admin = await prisma_1.prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    if (!admin)
        throw new errors_1.AppError("No support team available right now", 503);
    return admin.id;
}
async function contactSupport(userId, message) {
    const recipientId = await getSupportRecipientId();
    if (recipientId === userId)
        throw new errors_1.AppError("You can't message yourself", 400);
    return sendMessage(userId, recipientId, message);
}
