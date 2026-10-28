"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerActor = ownerActor;
exports.staffActor = staffActor;
exports.listThreads = listThreads;
exports.listMessages = listMessages;
exports.markRead = markRead;
exports.unreadTotal = unreadTotal;
exports.sendMessage = sendMessage;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const push_service_1 = require("./push.service");
const teamId = (bizProfileId) => `team_${bizProfileId}`;
const dmId = (staffId) => `dm_${staffId}`;
const actorKey = (actor) => (actor.type === "OWNER" ? actor.userId : actor.staffId);
async function ownerActor(userId, name) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { id: true, businessName: true } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return { type: "OWNER", userId, bizProfileId: profile.id, name: name ?? profile.businessName };
}
async function staffActor(staffId, bizProfileId) {
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId }, select: { name: true, status: true } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    if (staff.status !== "ACTIVE")
        throw new errors_1.AppError("Your account is suspended", 403);
    return { type: "STAFF", staffId, bizProfileId, name: staff.name };
}
async function ensureThread(bizProfileId, kind, staffId) {
    const id = kind === "TEAM" ? teamId(bizProfileId) : dmId(staffId);
    const existing = await prisma_1.prisma.chatThread.findUnique({ where: { id } });
    if (existing)
        return existing;
    try {
        return await prisma_1.prisma.chatThread.create({
            data: { id, bizProfileId, kind, staffId: kind === "DIRECT" ? staffId : null },
        });
    }
    catch (err) {
        if (err?.code === "P2002")
            return prisma_1.prisma.chatThread.findUniqueOrThrow({ where: { id } });
        throw err;
    }
}
async function resolveThread(actor, threadId) {
    if (threadId === teamId(actor.bizProfileId))
        return ensureThread(actor.bizProfileId, "TEAM");
    if (threadId.startsWith("dm_")) {
        const staffId = threadId.slice(3);
        if (actor.type === "STAFF" && actor.staffId !== staffId)
            throw new errors_1.AppError("Conversation not found", 404);
        const member = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId: actor.bizProfileId }, select: { id: true } });
        if (!member)
            throw new errors_1.AppError("Conversation not found", 404);
        return ensureThread(actor.bizProfileId, "DIRECT", staffId);
    }
    throw new errors_1.AppError("Conversation not found", 404);
}
function serializeMessage(message) {
    return {
        id: message.id,
        threadId: message.threadId,
        senderType: message.senderType,
        senderId: message.senderId,
        senderName: message.senderName,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
    };
}
async function listThreads(actor) {
    const team = await ensureThread(actor.bizProfileId, "TEAM");
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: actor.bizProfileId }, select: { businessName: true } });
    const entries = [
        { id: team.id, kind: "TEAM", title: "Team chat", subtitle: profile?.businessName ?? null },
    ];
    if (actor.type === "OWNER") {
        const staff = await prisma_1.prisma.bizStaff.findMany({
            where: { bizProfileId: actor.bizProfileId, status: "ACTIVE" },
            select: { id: true, name: true, role: true },
            orderBy: { name: "asc" },
        });
        for (const member of staff) {
            entries.push({ id: dmId(member.id), kind: "DIRECT", title: member.name, subtitle: member.role.replace(/_/g, " ").toLowerCase() });
        }
    }
    else {
        entries.push({ id: dmId(actor.staffId), kind: "DIRECT", title: "Owner", subtitle: profile?.businessName ?? null });
    }
    const ids = entries.map((entry) => entry.id);
    const [latest, reads] = await Promise.all([
        prisma_1.prisma.chatMessage.findMany({ where: { threadId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["threadId"] }),
        prisma_1.prisma.chatRead.findMany({ where: { threadId: { in: ids }, readerType: actor.type, readerId: actorKey(actor) } }),
    ]);
    const readAt = new Map(reads.map((read) => [read.threadId, read.lastReadAt]));
    const lastByThread = new Map(latest.map((message) => [message.threadId, message]));
    const unread = await Promise.all(ids.map((threadId) => prisma_1.prisma.chatMessage.count({
        where: {
            threadId,
            NOT: { senderType: actor.type, senderId: actorKey(actor) },
            ...(readAt.has(threadId) ? { createdAt: { gt: readAt.get(threadId) } } : {}),
        },
    })));
    return entries
        .map((entry, index) => {
        const last = lastByThread.get(entry.id);
        return {
            ...entry,
            unread: unread[index],
            lastMessage: last ? { body: last.body, senderName: last.senderName, createdAt: last.createdAt.toISOString() } : null,
        };
    })
        .sort((a, b) => {
        if (a.kind !== b.kind)
            return a.kind === "TEAM" ? -1 : 1;
        const left = a.lastMessage?.createdAt ?? "";
        const right = b.lastMessage?.createdAt ?? "";
        return right.localeCompare(left) || a.title.localeCompare(b.title);
    });
}
async function listMessages(actor, threadId, after, limit = 100) {
    const thread = await resolveThread(actor, threadId);
    if (after) {
        const since = new Date(after);
        if (Number.isNaN(since.getTime()))
            throw new errors_1.AppError("Invalid cursor", 400);
        const rows = await prisma_1.prisma.chatMessage.findMany({
            where: { threadId: thread.id, createdAt: { gte: since } },
            orderBy: { createdAt: "asc" },
            take: 200,
        });
        return rows.map(serializeMessage);
    }
    const rows = await prisma_1.prisma.chatMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
    return rows.reverse().map(serializeMessage);
}
async function markRead(actor, threadId) {
    const thread = await resolveThread(actor, threadId);
    const now = new Date();
    await prisma_1.prisma.chatRead.upsert({
        where: { threadId_readerType_readerId: { threadId: thread.id, readerType: actor.type, readerId: actorKey(actor) } },
        update: { lastReadAt: now },
        create: { threadId: thread.id, readerType: actor.type, readerId: actorKey(actor), lastReadAt: now },
    });
}
async function unreadTotal(actor) {
    const threads = await listThreads(actor);
    return threads.reduce((sum, thread) => sum + thread.unread, 0);
}
async function notifyRecipients(actor, thread, body) {
    const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body;
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: actor.bizProfileId }, select: { userId: true } });
    if (!profile)
        return;
    const team = thread.kind === "TEAM";
    const title = team ? `${actor.name} · Team chat` : actor.name;
    const staffTargets = [];
    if (actor.type === "STAFF") {
        if (team) {
            const others = await prisma_1.prisma.bizStaff.findMany({
                where: { bizProfileId: actor.bizProfileId, status: "ACTIVE", NOT: { id: actor.staffId } },
                select: { id: true },
            });
            staffTargets.push(...others.map((member) => member.id));
        }
    }
    else if (team) {
        const everyone = await prisma_1.prisma.bizStaff.findMany({ where: { bizProfileId: actor.bizProfileId, status: "ACTIVE" }, select: { id: true } });
        staffTargets.push(...everyone.map((member) => member.id));
    }
    else if (thread.staffId) {
        staffTargets.push(thread.staffId);
    }
    const jobs = [];
    if (actor.type === "STAFF") {
        jobs.push((0, push_service_1.sendPushToUser)(profile.userId, {
            title,
            body: preview,
            data: { kind: "chat", threadId: thread.id, threadTitle: team ? "Team chat" : actor.name },
        }));
    }
    if (staffTargets.length > 0) {
        jobs.push((0, push_service_1.sendPushToStaff)(staffTargets, {
            title,
            body: preview,
            data: { kind: "chat", threadId: thread.id, threadTitle: team ? "Team chat" : "Owner" },
        }));
    }
    await Promise.allSettled(jobs);
}
async function sendMessage(actor, threadId, body) {
    const thread = await resolveThread(actor, threadId);
    const key = actorKey(actor);
    const message = await prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.chatMessage.create({
            data: { threadId: thread.id, senderType: actor.type, senderId: key, senderName: actor.name, body },
        });
        await tx.chatThread.update({ where: { id: thread.id }, data: { lastMessageAt: created.createdAt } });
        await tx.chatRead.upsert({
            where: { threadId_readerType_readerId: { threadId: thread.id, readerType: actor.type, readerId: key } },
            update: { lastReadAt: created.createdAt },
            create: { threadId: thread.id, readerType: actor.type, readerId: key, lastReadAt: created.createdAt },
        });
        return created;
    });
    void notifyRecipients(actor, thread, body).catch(() => { });
    return serializeMessage(message);
}
