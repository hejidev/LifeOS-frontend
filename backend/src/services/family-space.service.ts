import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { invalidateAuthCache } from "../lib/auth-cache";
import { evaluateLock, loadLockRules, type LockRules } from "../lib/family-lock";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FAMILY_DOMAIN = "family.invalid";
const MAX_CHILDREN = 8;
const MAX_SCHEDULES = 5;

export const childSlug = (name: string) =>
  name.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 20);

const childEmail = (name: string, code: string) => `${childSlug(name)}.${code.toLowerCase()}@${FAMILY_DOMAIN}`;
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");

const lockView = (rules: LockRules) => {
  const state = evaluateLock(rules);
  return { locked: state.locked, until: state.until ? state.until.toISOString() : null, source: state.source };
};

const scheduleView = (schedule: { id: string; label: string; days: number[]; startMin: number; endMin: number; enabled: boolean }) => ({
  id: schedule.id,
  label: schedule.label,
  days: schedule.days,
  startMin: schedule.startMin,
  endMin: schedule.endMin,
  enabled: schedule.enabled,
});

async function contextOf(userId: string) {
  const member = await prisma.familyMember.findUnique({
    where: { memberUserId: userId },
    select: { id: true, userId: true, name: true },
  });
  if (member) return { role: "child" as const, ownerId: member.userId, memberId: member.id, name: member.name };

  const group = await prisma.familyGroup.findUnique({ where: { ownerId: userId } });
  return group ? { role: "parent" as const, ownerId: userId, memberId: null, name: null } : null;
}

async function requireGroup(parentId: string) {
  const group = await prisma.familyGroup.findUnique({ where: { ownerId: parentId } });
  if (!group) throw new AppError("Set up your family first", 400);
  return group;
}

async function childOf(parentId: string, memberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, userId: parentId, memberUserId: { not: null } },
  });
  if (!member?.memberUserId) throw new AppError("Child not found", 404);
  return { ...member, memberUserId: member.memberUserId };
}

export async function getMe(userId: string) {
  const ctx = await contextOf(userId);
  if (!ctx) return { role: "none" as const };

  if (ctx.role === "parent") {
    const group = await requireGroup(userId);
    return { role: "parent" as const, familyCode: group.familyCode, consent: !!group.consentAt };
  }

  const [rules, schedules] = await Promise.all([
    loadLockRules(userId),
    prisma.familySchedule.findMany({ where: { memberId: ctx.memberId, enabled: true } }),
  ]);
  return {
    role: "child" as const,
    name: ctx.name,
    lock: rules ? lockView(rules) : { locked: false, until: null, source: null },
    schedules: schedules.map(scheduleView),
  };
}

export async function setupFamily(parentId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await prisma.familyGroup.findUnique({ where: { ownerId: parentId } });
    if (existing) return { familyCode: existing.familyCode };
    try {
      const group = await prisma.familyGroup.create({ data: { ownerId: parentId, familyCode: newCode(), consentAt: new Date() } });
      return { familyCode: group.familyCode };
    } catch (err: any) {
      if (err?.code !== "P2002") throw err;
    }
  }
  throw new AppError("Couldn't create the family. Try again.", 500);
}

export async function listMembers(parentId: string) {
  await requireGroup(parentId);
  const owner = await prisma.user.findUnique({ where: { id: parentId }, select: { timezone: true } });
  const zone = owner?.timezone || "Africa/Lagos";

  const members = await prisma.familyMember.findMany({
    where: { userId: parentId },
    include: {
      schedules: { orderBy: { id: "asc" } },
      overrides: { where: { until: { gt: new Date() } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((member) => {
    const hasAccount = !!member.memberUserId;
    const rules: LockRules = {
      zone,
      schedules: member.schedules.filter((schedule) => schedule.enabled),
      overrides: member.overrides,
    };
    const override = member.overrides[0];
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      hasAccount,
      lock: hasAccount ? lockView(rules) : null,
      schedules: member.schedules.map(scheduleView),
      override: override ? { kind: override.kind, until: override.until.toISOString() } : null,
    };
  });
}

export async function createChild(parentId: string, input: { name: string; password: string }) {
  const group = await requireGroup(parentId);
  if (!group.consentAt) throw new AppError("Confirm parental consent first", 400);

  const name = input.name.trim();
  if (!childSlug(name)) throw new AppError("Use letters or numbers in the child's name", 400);

  const children = await prisma.familyMember.count({ where: { userId: parentId, memberUserId: { not: null } } });
  if (children >= MAX_CHILDREN) throw new AppError(`You can add up to ${MAX_CHILDREN} children`, 400);

  const email = childEmail(name, group.familyCode);
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError("A child with that name already exists in your family", 409);
  }

  const parent = await prisma.user.findUnique({ where: { id: parentId }, select: { timezone: true } });
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "USER",
        provider: "CREDENTIALS",
        emailVerified: true,
        timezone: parent?.timezone ?? "Africa/Lagos",
      },
    });
    const member = await tx.familyMember.create({
      data: { userId: parentId, name, role: "CHILD", memberUserId: user.id },
    });
    return { id: member.id, name: member.name };
  });
}

export async function resetChildPassword(parentId: string, memberId: string, password: string) {
  const member = await childOf(parentId, memberId);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: member.memberUserId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  invalidateAuthCache(member.memberUserId);
}

export async function deleteChild(parentId: string, memberId: string) {
  const member = await childOf(parentId, memberId);
  await prisma.$transaction([
    prisma.familyMember.delete({ where: { id: member.id } }),
    prisma.user.delete({ where: { id: member.memberUserId } }),
  ]);
  invalidateAuthCache(member.memberUserId);
}

export async function saveSchedules(
  parentId: string,
  memberId: string,
  schedules: { label?: string; days: number[]; startMin: number; endMin: number; enabled: boolean }[]
) {
  const member = await childOf(parentId, memberId);
  if (schedules.length > MAX_SCHEDULES) throw new AppError(`Use at most ${MAX_SCHEDULES} schedules`, 400);
  if (schedules.some((schedule) => schedule.startMin === schedule.endMin)) {
    throw new AppError("A schedule can't start and end at the same time", 400);
  }

  await prisma.$transaction([
    prisma.familySchedule.deleteMany({ where: { memberId } }),
    prisma.familySchedule.createMany({
      data: schedules.map((schedule) => ({
        memberId,
        label: schedule.label?.trim() || "Bedtime",
        days: [...new Set(schedule.days)].sort(),
        startMin: schedule.startMin,
        endMin: schedule.endMin,
        enabled: schedule.enabled,
      })),
    }),
  ]);
  invalidateAuthCache(member.memberUserId);
}

export async function setOverride(parentId: string, memberId: string, kind: "LOCK" | "UNLOCK", minutes: number) {
  const member = await childOf(parentId, memberId);
  await prisma.$transaction([
    prisma.familyOverride.deleteMany({ where: { memberId } }),
    prisma.familyOverride.create({
      data: { memberId, kind, until: new Date(Date.now() + minutes * 60_000), createdBy: parentId },
    }),
  ]);
  invalidateAuthCache(member.memberUserId);
}

export async function clearOverride(parentId: string, memberId: string) {
  const member = await childOf(parentId, memberId);
  await prisma.familyOverride.deleteMany({ where: { memberId } });
  invalidateAuthCache(member.memberUserId);
}

async function threadAccess(userId: string, key: string) {
  const ctx = await contextOf(userId);
  if (!ctx) throw new AppError("Family not found", 404);
  if (key === "group") return ctx;
  if (!key.startsWith("dm_")) throw new AppError("Conversation not found", 404);

  const kidId = key.slice(3);
  if (ctx.role === "child" && kidId !== userId) throw new AppError("Conversation not found", 404);
  const kid = await prisma.familyMember.findFirst({ where: { userId: ctx.ownerId, memberUserId: kidId }, select: { id: true } });
  if (!kid) throw new AppError("Conversation not found", 404);
  return ctx;
}

export async function listThreads(userId: string) {
  const ctx = await contextOf(userId);
  if (!ctx) return [];

  const kids = await prisma.familyMember.findMany({
    where: { userId: ctx.ownerId, memberUserId: { not: null } },
    select: { memberUserId: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const entries = [
    { key: "group", title: "Family chat" },
    ...(ctx.role === "parent"
      ? kids.map((kid) => ({ key: `dm_${kid.memberUserId}`, title: kid.name }))
      : [{ key: `dm_${userId}`, title: "Parent" }]),
  ];

  return Promise.all(
    entries.map(async (entry) => {
      const [last, read] = await Promise.all([
        prisma.familyMessage.findFirst({ where: { ownerId: ctx.ownerId, threadKey: entry.key }, orderBy: { createdAt: "desc" } }),
        prisma.familyRead.findUnique({ where: { userId_ownerId_threadKey: { userId, ownerId: ctx.ownerId, threadKey: entry.key } } }),
      ]);
      const unread = await prisma.familyMessage.count({
        where: {
          ownerId: ctx.ownerId,
          threadKey: entry.key,
          senderId: { not: userId },
          ...(read ? { createdAt: { gt: read.lastReadAt } } : {}),
        },
      });
      return {
        ...entry,
        unread,
        last: last ? { body: last.body, at: last.createdAt.toISOString(), senderName: last.senderName } : null,
      };
    })
  );
}

export async function listMessages(userId: string, key: string) {
  const ctx = await threadAccess(userId, key);
  const rows = await prisma.familyMessage.findMany({
    where: { ownerId: ctx.ownerId, threadKey: key },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.reverse().map((message) => ({
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    mine: message.senderId === userId,
    fromParent: message.senderId === ctx.ownerId,
  }));
}

export async function markRead(userId: string, key: string) {
  const ctx = await threadAccess(userId, key);
  const now = new Date();
  await prisma.familyRead.upsert({
    where: { userId_ownerId_threadKey: { userId, ownerId: ctx.ownerId, threadKey: key } },
    update: { lastReadAt: now },
    create: { userId, ownerId: ctx.ownerId, threadKey: key, lastReadAt: now },
  });
}

export async function sendMessage(userId: string, key: string, body: string) {
  const ctx = await threadAccess(userId, key);
  const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const message = await prisma.familyMessage.create({
    data: { ownerId: ctx.ownerId, threadKey: key, senderId: userId, senderName: sender?.name ?? "Family member", body },
  });
  await markRead(userId, key);
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    mine: true,
    fromParent: userId === ctx.ownerId,
  };
}