"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.issueRefreshToken = issueRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeFamily = revokeFamily;
exports.revokeAllUserSessions = revokeAllUserSessions;
exports.revokeRefreshToken = revokeRefreshToken;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET);
}
async function issueRefreshToken(userId, sessionVersion, familyId) {
    const family = familyId ?? crypto_1.default.randomUUID();
    const raw = crypto_1.default.randomBytes(64).toString("hex");
    const hashed = hashToken(raw);
    const [result1, result2] = await Promise.all([
        redis_1.redis.set(`refresh:${hashed}`, JSON.stringify({ userId, family, sessionVersion }), "EX", REFRESH_TOKEN_TTL_SECONDS),
        redis_1.redis.set(`refresh:family:${family}`, hashed, "EX", REFRESH_TOKEN_TTL_SECONDS),
        redis_1.redis.sadd(`refresh:user:${userId}`, family),
    ]);
    if (result1 !== "OK" || result2 !== "OK") {
        throw new Error("Failed to persist refresh token — Redis write did not confirm");
    }
    await redis_1.redis.expire(`refresh:user:${userId}`, REFRESH_TOKEN_TTL_SECONDS);
    return { raw, family };
}
async function rotateRefreshToken(rawToken) {
    const hashed = hashToken(rawToken);
    const stored = await redis_1.redis.get(`refresh:${hashed}`);
    if (!stored)
        return null;
    const { userId, family, sessionVersion } = JSON.parse(stored);
    const currentValidHash = await redis_1.redis.get(`refresh:family:${family}`);
    if (currentValidHash !== hashed) {
        await revokeFamily(family);
        return "REUSE_DETECTED";
    }
    await redis_1.redis.del(`refresh:${hashed}`);
    const next = await issueRefreshToken(userId, sessionVersion ?? -1, family);
    return { userId, sessionVersion, ...next };
}
async function revokeFamily(family) {
    const hashed = await redis_1.redis.get(`refresh:family:${family}`);
    if (hashed) {
        const stored = await redis_1.redis.get(`refresh:${hashed}`);
        if (stored) {
            const { userId } = JSON.parse(stored);
            await redis_1.redis.srem(`refresh:user:${userId}`, family);
        }
        await redis_1.redis.del(`refresh:${hashed}`);
    }
    await redis_1.redis.del(`refresh:family:${family}`);
}
async function revokeAllUserSessions(userId) {
    const families = await redis_1.redis.smembers(`refresh:user:${userId}`);
    await Promise.all(families.map(revokeFamily));
    await redis_1.redis.del(`refresh:user:${userId}`);
}
async function revokeRefreshToken(rawToken) {
    const hashed = hashToken(rawToken);
    const stored = await redis_1.redis.get(`refresh:${hashed}`);
    if (stored) {
        const { family } = JSON.parse(stored);
        await revokeFamily(family);
    }
}
