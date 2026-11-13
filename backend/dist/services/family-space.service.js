"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.childSlug = void 0;
exports.getMe = getMe;
exports.setupFamily = setupFamily;
exports.listMembers = listMembers;
exports.createChild = createChild;
exports.resetChildPassword = resetChildPassword;
exports.deleteChild = deleteChild;
exports.saveSchedules = saveSchedules;
exports.setOverride = setOverride;
exports.clearOverride = clearOverride;
exports.listThreads = listThreads;
exports.listMessages = listMessages;
exports.markRead = markRead;
exports.sendMessage = sendMessage;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const auth_cache_1 = require("../lib/auth-cache");
const family_lock_1 = require("../lib/family-lock");
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FAMILY_DOMAIN = "family.invalid";
const MAX_CHILDREN = 8;
const MAX_SCHEDULES = 5;
const childSlug = (name) => name.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 20);
exports.childSlug = childSlug;
const childEmail = (name, code) => `${(0, exports.childSlug)(name)}.${code.toLowerCase()}@${FAMILY_DOMAIN}`;
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[crypto_1.default.randomInt(CODE_ALPHABET.length)]).join("");
const lockView = (rules) => {
    const state = (0, family_lock_1.evaluateLock)(rules);
    return { locked: state.locked, until: state.until ? state.until.toISOString() : null, source: state.source };
};
const scheduleView = (schedule) => ({
    id: schedule.id,
    label: schedule.label,
    days: schedule.days,
    startMin: schedule.startMin,
    endMin: schedule.endMin,
    enabled: schedule.enabled,
});
async function contextOf(userId) {
    const member = await prisma_1.prisma.familyMember.findUnique({
        where: { memberUserId: userId },
        select: { id: true, userId: true, name: true },
    });
    if (member)
        return { role: "child", ownerId: member.userId, memberId: member.id, name: member.name };
    const group = await prisma_1.prisma.familyGroup.findUnique({ where: { ownerId: userId } });
    return group ? { role: "parent", ownerId: userId, memberId: null, name: null } : null;
}
async function requireGroup(parentId) {
    const group = await prisma_1.prisma.familyGroup.findUnique({ where: { ownerId: parentId } });
    if (!group)
        throw new errors_1.AppError("Set up your family first", 400);
    return group;
}
async function childOf(parentId, memberId) {
    const member = await prisma_1.prisma.familyMember.findFirst({
        where: { id: memberId, userId: parentId, memberUserId: { not: null } },
    });
    if (!member?.memberUserId)
        throw new errors_1.AppError("Child not found", 404);
    return { ...member, memberUserId: member.memberUserId };
}
async function getMe(userId) {
    const ctx = await contextOf(userId);
    if (!ctx)
        return { role: "none" };
    if (ctx.role === "parent") {
        const group = await requireGroup(userId);
        return { role: "parent", familyCode: group.familyCode, consent: !!group.consentAt };
    }
    const [rules, schedules] = await Promise.all([
        (0, family_lock_1.loadLockRules)(userId),
        prisma_1.prisma.familySchedule.findMany({ where: { memberId: ctx.memberId, enabled: true } }),
    ]);
    return {
        role: "child",
        name: ctx.name,
        lock: rules ? lockView(rules) : { locked: false, until: null, source: null },
        schedules: schedules.map(scheduleView),
    };
}
async function setupFamily(parentId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const existing = await prisma_1.prisma.familyGroup.findUnique({ where: { ownerId: parentId } });
        if (existing)
            return { familyCode: existing.familyCode };
        try {
            const group = await prisma_1.prisma.familyGroup.create({ data: { ownerId: parentId, familyCode: newCode(), consentAt: new Date() } });
            return { familyCode: group.familyCode };
        }
        catch (err) {
            if (err?.code !== "P2002")
                throw err;
        }
    }
    throw new errors_1.AppError("Couldn't create the family. Try again.", 500);
}
async function listMembers(parentId) {
    await requireGroup(parentId);
    const owner = await prisma_1.prisma.user.findUnique({ where: { id: parentId }, select: { timezone: true } });
    const zone = owner?.timezone || "Africa/Lagos";
    const members = await prisma_1.prisma.familyMember.findMany({
        where: { userId: parentId },
        include: {
            schedules: { orderBy: { id: "asc" } },
            overrides: { where: { until: { gt: new Date() } }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" },
    });
    return members.map((member) => {
        const hasAccount = !!member.memberUserId;
        const rules = {
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
async function createChild(parentId, input) {
    const group = await requireGroup(parentId);
    if (!group.consentAt)
        throw new errors_1.AppError("Confirm parental consent first", 400);
    const name = input.name.trim();
    if (!(0, exports.childSlug)(name))
        throw new errors_1.AppError("Use letters or numbers in the child's name", 400);
    const children = await prisma_1.prisma.familyMember.count({ where: { userId: parentId, memberUserId: { not: null } } });
    if (children >= MAX_CHILDREN)
        throw new errors_1.AppError(`You can add up to ${MAX_CHILDREN} children`, 400);
    const email = childEmail(name, group.familyCode);
    if (await prisma_1.prisma.user.findUnique({ where: { email } })) {
        throw new errors_1.AppError("A child with that name already exists in your family", 409);
    }
    const parent = await prisma_1.prisma.user.findUnique({ where: { id: parentId }, select: { timezone: true } });
    const passwordHash = await bcrypt_1.default.hash(input.password, 12);
    return prisma_1.prisma.$transaction(async (tx) => {
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
async function resetChildPassword(parentId, memberId, password) {
    const member = await childOf(parentId, memberId);
    const passwordHash = await bcrypt_1.default.hash(password, 12);
    await prisma_1.prisma.user.update({
        where: { id: member.memberUserId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    (0, auth_cache_1.invalidateAuthCache)(member.memberUserId);
}
async function deleteChild(parentId, memberId) {
    const member = await childOf(parentId, memberId);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.familyMember.delete({ where: { id: member.id } }),
        prisma_1.prisma.user.delete({ where: { id: member.memberUserId } }),
    ]);
    (0, auth_cache_1.invalidateAuthCache)(member.memberUserId);
}
async function saveSchedules(parentId, memberId, schedules) {
    const member = await childOf(parentId, memberId);
    if (schedules.length > MAX_SCHEDULES)
        throw new errors_1.AppError(`Use at most ${MAX_SCHEDULES} schedules`, 400);
    if (schedules.some((schedule) => schedule.startMin === schedule.endMin)) {
        throw new errors_1.AppError("A schedule can't start and end at the same time", 400);
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.familySchedule.deleteMany({ where: { memberId } }),
        prisma_1.prisma.familySchedule.createMany({
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
    (0, auth_cache_1.invalidateAuthCache)(member.memberUserId);
}
async function setOverride(parentId, memberId, kind, minutes) {
    const member = await childOf(parentId, memberId);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.familyOverride.deleteMany({ where: { memberId } }),
        prisma_1.prisma.familyOverride.create({
            data: { memberId, kind, until: new Date(Date.now() + minutes * 60000), createdBy: parentId },
        }),
    ]);
    (0, auth_cache_1.invalidateAuthCache)(member.memberUserId);
}
async function clearOverride(parentId, memberId) {
    const member = await childOf(parentId, memberId);
    await prisma_1.prisma.familyOverride.deleteMany({ where: { memberId } });
    (0, auth_cache_1.invalidateAuthCache)(member.memberUserId);
}
async function threadAccess(userId, key) {
    const ctx = await contextOf(userId);
    if (!ctx)
        throw new errors_1.AppError("Family not found", 404);
    if (key === "group")
        return ctx;
    if (!key.startsWith("dm_"))
        throw new errors_1.AppError("Conversation not found", 404);
    const kidId = key.slice(3);
    if (ctx.role === "child" && kidId !== userId)
        throw new errors_1.AppError("Conversation not found", 404);
    const kid = await prisma_1.prisma.familyMember.findFirst({ where: { userId: ctx.ownerId, memberUserId: kidId }, select: { id: true } });
    if (!kid)
        throw new errors_1.AppError("Conversation not found", 404);
    return ctx;
}
async function listThreads(userId) {
    const ctx = await contextOf(userId);
    if (!ctx)
        return [];
    const kids = await prisma_1.prisma.familyMember.findMany({
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
    return Promise.all(entries.map(async (entry) => {
        const [last, read] = await Promise.all([
            prisma_1.prisma.familyMessage.findFirst({ where: { ownerId: ctx.ownerId, threadKey: entry.key }, orderBy: { createdAt: "desc" } }),
            prisma_1.prisma.familyRead.findUnique({ where: { userId_ownerId_threadKey: { userId, ownerId: ctx.ownerId, threadKey: entry.key } } }),
        ]);
        const unread = await prisma_1.prisma.familyMessage.count({
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
    }));
}
async function listMessages(userId, key) {
    const ctx = await threadAccess(userId, key);
    const rows = await prisma_1.prisma.familyMessage.findMany({
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
async function markRead(userId, key) {
    const ctx = await threadAccess(userId, key);
    const now = new Date();
    await prisma_1.prisma.familyRead.upsert({
        where: { userId_ownerId_threadKey: { userId, ownerId: ctx.ownerId, threadKey: key } },
        update: { lastReadAt: now },
        create: { userId, ownerId: ctx.ownerId, threadKey: key, lastReadAt: now },
    });
}
async function sendMessage(userId, key, body) {
    const ctx = await threadAccess(userId, key);
    const sender = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const message = await prisma_1.prisma.familyMessage.create({
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
