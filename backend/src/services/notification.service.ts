import { prisma } from "../config/prisma";
import { getIO } from "../sockets/io-instance";

export async function createNotification(userId: string, data: {
  type?: string; title: string; message: string; actionUrl?: string;
}) {
  const notification = await prisma.notification.create({
    data: { userId, type: (data.type as any) ?? "INFO", title: data.title, message: data.message, actionUrl: data.actionUrl },
  });

  const io = getIO();
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

export async function listNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly && { read: false }) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAsRead(userId: string, id: string) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function deleteNotification(userId: string, id: string) {
  await prisma.notification.deleteMany({ where: { id, userId } });
}