"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.listNotifications = listNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.deleteNotification = deleteNotification;
const prisma_1 = require("../config/prisma");
const io_instance_1 = require("../sockets/io-instance");
async function createNotification(userId, data) {
    const notification = await prisma_1.prisma.notification.create({
        data: { userId, type: data.type ?? "INFO", title: data.title, message: data.message, actionUrl: data.actionUrl },
    });
    const io = (0, io_instance_1.getIO)();
    if (io) {
        io.to(`user:${userId}`).emit("notification:new", {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.actionUrl,
            read: notification.read,
            createdAt: notification.createdAt.toISOString(),
        });
    }
    return notification;
}
async function listNotifications(userId, unreadOnly = false) {
    return prisma_1.prisma.notification.findMany({
        where: { userId, ...(unreadOnly && { read: false }) },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
}
async function getUnreadCount(userId) {
    return prisma_1.prisma.notification.count({ where: { userId, read: false } });
}
async function markAsRead(userId, id) {
    await prisma_1.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}
async function markAllAsRead(userId) {
    await prisma_1.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
async function deleteNotification(userId, id) {
    await prisma_1.prisma.notification.deleteMany({ where: { id, userId } });
}
