"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserToken = registerUserToken;
exports.registerStaffToken = registerStaffToken;
exports.removeUserToken = removeUserToken;
exports.removeStaffToken = removeStaffToken;
exports.sendPushToUser = sendPushToUser;
exports.sendPushToStaff = sendPushToStaff;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../lib/logger");
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;
async function registerUserToken(userId, token, platform) {
    await prisma_1.prisma.pushToken.upsert({
        where: { token },
        update: { userId, staffId: null, bizProfileId: null, platform },
        create: { token, userId, platform },
    });
}
async function registerStaffToken(staffId, bizProfileId, token, platform) {
    await prisma_1.prisma.pushToken.upsert({
        where: { token },
        update: { staffId, bizProfileId, userId: null, platform },
        create: { token, staffId, bizProfileId, platform },
    });
}
async function removeUserToken(userId, token) {
    await prisma_1.prisma.pushToken.deleteMany({ where: { token, userId } });
}
async function removeStaffToken(staffId, token) {
    await prisma_1.prisma.pushToken.deleteMany({ where: { token, staffId } });
}
async function deliver(tokens, message) {
    if (tokens.length === 0)
        return;
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN)
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    for (let index = 0; index < tokens.length; index += CHUNK_SIZE) {
        const batch = tokens.slice(index, index + CHUNK_SIZE);
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers,
                body: JSON.stringify(batch.map((to) => ({
                    to,
                    title: message.title,
                    body: message.body,
                    data: message.data ?? {},
                    sound: "default",
                    channelId: "default",
                    priority: "high",
                }))),
            });
            if (!response.ok) {
                logger_1.logger.error(`[push] expo responded with ${response.status}`);
                continue;
            }
            const result = (await response.json());
            const dead = batch.filter((_, position) => result.data?.[position]?.details?.error === "DeviceNotRegistered");
            if (dead.length > 0)
                await prisma_1.prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
        }
        catch (err) {
            logger_1.logger.error("[push] delivery failed:", err);
        }
    }
}
async function sendPushToUser(userId, message) {
    const rows = await prisma_1.prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    await deliver(rows.map((row) => row.token), message);
}
async function sendPushToStaff(staffIds, message) {
    if (staffIds.length === 0)
        return;
    const rows = await prisma_1.prisma.pushToken.findMany({ where: { staffId: { in: staffIds } }, select: { token: true } });
    await deliver(rows.map((row) => row.token), message);
}
