import crypto from "crypto";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { env } from "../config/env";
import { sendFamilyInviteEmail } from "./email.service";

export async function getFamilyDashboard(userId: string) {
  const [members, controls, invites] = await Promise.all([
    prisma.familyMember.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.familyControl.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.familyInvite.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);

  const childCount = members.filter((m) => m.role === "CHILD").length;
  const locationSharingCount = members.filter((m) => m.locationSharing).length;
  const enabledControls = controls.filter((c) => c.enabled).length;

  const insight = members.length === 0
    ? "Add family members to start managing screen time and safety controls."
    : `${members.length} member${members.length === 1 ? "" : "s"}, ${enabledControls} active control${enabledControls === 1 ? "" : "s"}.`;

  return {
    members, controls, pendingInvites: invites,
    stats: { totalMembers: members.length, childCount, locationSharingCount, enabledControls },
    insight,
  };
}

export async function createMember(userId: string, data: { name: string; role: string; device?: string; locationSharing?: boolean }) {
  return prisma.familyMember.create({
    data: { userId, name: data.name, role: data.role as any, device: data.device, locationSharing: data.locationSharing ?? false },
  });
}

export async function updateMember(userId: string, id: string, data: {
  name?: string; role?: string; device?: string; locationSharing?: boolean; status?: string; screenTimeMinutesToday?: number; avatarUrl?: string;
}) {
  const existing = await prisma.familyMember.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Family member not found", 404);
  return prisma.familyMember.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role as any }),
      ...(data.device !== undefined && { device: data.device }),
      ...(data.locationSharing !== undefined && { locationSharing: data.locationSharing }),
      ...(data.status && { status: data.status as any }),
      ...(data.screenTimeMinutesToday !== undefined && { screenTimeMinutesToday: data.screenTimeMinutesToday }),
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
    },
  });
}

export async function deleteMember(userId: string, id: string) {
  const existing = await prisma.familyMember.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Family member not found", 404);
  await prisma.familyMember.delete({ where: { id } });
}

export async function createControl(userId: string, data: { memberId?: string; title: string; description?: string; enabled?: boolean; value?: string }) {
  return prisma.familyControl.create({
    data: { userId, memberId: data.memberId, title: data.title, description: data.description, enabled: data.enabled ?? true, value: data.value },
  });
}

export async function updateControl(userId: string, id: string, data: { title?: string; description?: string; enabled?: boolean; value?: string }) {
  const existing = await prisma.familyControl.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Control not found", 404);
  return prisma.familyControl.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.value !== undefined && { value: data.value }),
    },
  });
}

export async function deleteControl(userId: string, id: string) {
  const existing = await prisma.familyControl.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Control not found", 404);
  await prisma.familyControl.delete({ where: { id } });
}

export async function createInvite(userId: string, ownerName: string, data: { email: string; role: string }) {
  const token = crypto.randomBytes(24).toString("hex");
  const invite = await prisma.familyInvite.create({
    data: { userId, email: data.email, role: data.role as any, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const link = `${env.FRONTEND_URL}/family/join?token=${token}`;
  await sendFamilyInviteEmail(data.email, ownerName, link);

  return invite;
}

export async function revokeInvite(userId: string, id: string) {
  const existing = await prisma.familyInvite.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Invite not found", 404);
  await prisma.familyInvite.update({ where: { id }, data: { status: "REVOKED" } });
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.familyInvite.findUnique({ where: { token } });
  if (!invite) throw new AppError("Invite not found", 404);
  if (invite.status !== "PENDING") throw new AppError("This invite is no longer valid", 400);
  if (invite.expiresAt < new Date()) {
    await prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    throw new AppError("This invite has expired", 400);
  }

  const inviter = await prisma.user.findUnique({ where: { id: invite.userId } });

  return {
    email: invite.email,
    role: invite.role,
    inviterName: inviter?.name ?? "A LifeOS user",
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function acceptInvite(token: string, memberName: string) {
  const invite = await prisma.familyInvite.findUnique({ where: { token } });
  if (!invite) throw new AppError("Invite not found", 404);
  if (invite.status !== "PENDING") throw new AppError("This invite is no longer valid", 400);
  if (invite.expiresAt < new Date()) {
    await prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    throw new AppError("This invite has expired", 400);
  }

  const member = await prisma.familyMember.create({
    data: { userId: invite.userId, name: memberName, role: invite.role },
  });

  await prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });

  return member;
}