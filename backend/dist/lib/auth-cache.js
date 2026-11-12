"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAuthCache = invalidateAuthCache;
exports.loadAuthUser = loadAuthUser;
const prisma_1 = require("../config/prisma");
const parsedTtl = Number(process.env.AUTH_CACHE_TTL_MS);
const TTL_MS = Number.isFinite(parsedTtl) && parsedTtl >= 0 ? parsedTtl : 15000;
const MAX_ENTRIES = 5000;
const cache = new Map();
const inflight = new Map();
let epoch = 0;
function invalidateAuthCache(userId) {
    epoch += 1;
    if (userId) {
        cache.delete(userId);
        inflight.delete(userId);
    }
    else {
        cache.clear();
        inflight.clear();
    }
}
async function loadAuthUser(id) {
    const hit = cache.get(id);
    if (hit && hit.expires > Date.now())
        return hit.user;
    const pending = inflight.get(id);
    if (pending)
        return pending;
    const started = epoch;
    const task = prisma_1.prisma.user
        .findUnique({
        where: { id },
        select: { id: true, email: true, role: true, name: true, isActive: true, sessionVersion: true },
    })
        .then((row) => {
        if (!row)
            return null;
        const user = {
            id: row.id,
            email: row.email,
            role: String(row.role),
            name: row.name,
            isActive: row.isActive,
            sessionVersion: row.sessionVersion,
        };
        if (started === epoch && TTL_MS > 0) {
            if (cache.size >= MAX_ENTRIES)
                cache.clear();
            cache.set(id, { user, expires: Date.now() + TTL_MS });
        }
        return user;
    })
        .finally(() => {
        if (inflight.get(id) === task)
            inflight.delete(id);
    });
    inflight.set(id, task);
    return task;
}
