"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserClock = getUserClock;
exports.invalidateUserClock = invalidateUserClock;
const prisma_1 = require("../config/prisma");
const TTL_MS = 60000;
const MAX_ENTRIES = 5000;
const cache = new Map();
async function getUserClock(userId) {
    const hit = cache.get(userId);
    if (hit && hit.expires > Date.now())
        return hit.clock;
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, weekStartsOn: true } });
    const weekStartsOn = user?.weekStartsOn;
    const clock = {
        zone: user?.timezone || "Africa/Lagos",
        weekStartsOn: Number.isInteger(weekStartsOn) && weekStartsOn >= 0 && weekStartsOn <= 6 ? weekStartsOn : 1,
    };
    if (cache.size >= MAX_ENTRIES)
        cache.clear();
    cache.set(userId, { clock, expires: Date.now() + TTL_MS });
    return clock;
}
function invalidateUserClock(userId) {
    cache.delete(userId);
}
