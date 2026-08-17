import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { logAdminAction } from "./audit.service";
import { getIO } from "../sockets/io-instance";

export async function changeUserRole(actingAdminId: string, targetUserId: string, newRole: "USER" | "ADMIN" | "SUPER_ADMIN") {
  if (actingAdminId === targetUserId) {
    throw new AppError("You cannot change your own role", 400);
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new AppError("User not found", 404);

  if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superAdminCount <= 1) throw new AppError("Cannot remove the last super admin", 400);
  }

  const updated = await prisma.user.update({ where: { id: targetUserId }, data: { role: newRole as any } });

  if (newRole !== "ADMIN") {
    await prisma.adminPermission.deleteMany({ where: { userId: targetUserId } });
  }

  await logAdminAction(actingAdminId, "ROLE_CHANGED", "User", targetUserId, `Changed ${updated.email} from ${target.role} to ${newRole}`);
  return updated;
}

export async function createAdmin(actingAdminId: string, data: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("Email already in use", 409);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, passwordHash, role: "ADMIN" as any, provider: "CREDENTIALS" as any, emailVerified: true },
  });

  await logAdminAction(actingAdminId, "ADMIN_CREATED", "User", user.id, `Created admin account for ${user.email}`);
  return user;
}

export async function grantPermission(actingAdminId: string, userId: string, capability: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  if (target.role !== "ADMIN") throw new AppError("Permissions can only be granted to admins", 400);

  await prisma.adminPermission.upsert({
    where: { userId_capability: { userId, capability: capability as any } },
    update: {},
    create: { userId, capability: capability as any, grantedBy: actingAdminId },
  });

  await logAdminAction(actingAdminId, "PERMISSION_GRANTED", "User", userId, `Granted ${capability} to ${target.email}`);
}

export async function revokePermission(actingAdminId: string, userId: string, capability: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);

  await prisma.adminPermission.deleteMany({ where: { userId, capability: capability as any } });
  await logAdminAction(actingAdminId, "PERMISSION_REVOKED", "User", userId, `Revoked ${capability} from ${target.email}`);
}

export async function getAdmins() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" as any },
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  return admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    createdAt: a.createdAt.toISOString(),
    permissions: a.permissions.map((p) => p.capability),
  }));
}

export async function sendBroadcast(actingAdminId: string, data: { title: string; message: string; audience: "ALL" | "USERS" | "MERCHANTS" }) {
  let userIds: string[];

  if (data.audience === "MERCHANTS") {
    const profiles = await prisma.bizProfile.findMany({ where: { status: "APPROVED" }, select: { userId: true } });
    userIds = profiles.map((p) => p.userId);
  } else if (data.audience === "USERS") {
    const users = await prisma.user.findMany({ where: { isActive: true, role: "USER" as any }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else {
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    userIds = users.map((u) => u.id);
  }

  if (userIds.length === 0) return { sentTo: 0 };

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: "SYSTEM" as any, title: data.title, message: data.message })),
  });

  const io = getIO();
  if (io) {
    for (const userId of userIds) {
      io.to(`user:${userId}`).emit("notification:new", {
        type: "SYSTEM", title: data.title, message: data.message, read: false, createdAt: new Date().toISOString(),
      });
    }
  }

  await logAdminAction(actingAdminId, "BROADCAST_SENT", "Broadcast", "n/a", `Sent "${data.title}" to ${userIds.length} recipients (${data.audience})`);
  return { sentTo: userIds.length };
}