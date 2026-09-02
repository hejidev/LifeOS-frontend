import crypto from "crypto";
import jwt from "jsonwebtoken";
import { redis } from "../config/redis";
import { env } from "../config/env";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface AccessTokenPayload {
  sub: string;
  role: string;
  sv: number;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload & {
    iat: number;
    exp: number;
  };
}

export async function issueRefreshToken(userId: string, sessionVersion: number, familyId?: string) {
  const family = familyId ?? crypto.randomUUID();
  const raw = crypto.randomBytes(64).toString("hex");
  const hashed = hashToken(raw);

  const [result1, result2] = await Promise.all([
    redis.set(`refresh:${hashed}`, JSON.stringify({ userId, family, sessionVersion }), "EX", REFRESH_TOKEN_TTL_SECONDS),
    redis.set(`refresh:family:${family}`, hashed, "EX", REFRESH_TOKEN_TTL_SECONDS),
    redis.sadd(`refresh:user:${userId}`, family),
  ]);

  if (result1 !== "OK" || result2 !== "OK") {
    throw new Error("Failed to persist refresh token — Redis write did not confirm");
  }
  await redis.expire(`refresh:user:${userId}`, REFRESH_TOKEN_TTL_SECONDS);

  return { raw, family };
}

export async function rotateRefreshToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  console.log("[token-service] Rotating token, hashed length:", hashed.length);
  const stored = await redis.get(`refresh:${hashed}`);
  console.log("[token-service] Token found in Redis:", !!stored);
  if (!stored) return null;

  const { userId, family, sessionVersion } = JSON.parse(stored) as {
    userId: string;
    family: string;
    sessionVersion?: number;
  };
  console.log("[token-service] Token data - userId:", userId, "family:", family, "sessionVersion:", sessionVersion);
  const currentValidHash = await redis.get(`refresh:family:${family}`);
  console.log("[token-service] Current valid hash matches:", currentValidHash === hashed);

  if (currentValidHash !== hashed) {
    console.log("[token-service] Reuse detected, revoking family");
    await revokeFamily(family);
    return "REUSE_DETECTED" as const;
  }

  await redis.del(`refresh:${hashed}`);
  const next = await issueRefreshToken(userId, sessionVersion ?? -1, family);
  return { userId, sessionVersion, ...next };
}

export async function revokeFamily(family: string) {
  const hashed = await redis.get(`refresh:family:${family}`);
  if (hashed) {
    const stored = await redis.get(`refresh:${hashed}`);
    if (stored) {
      const { userId } = JSON.parse(stored) as { userId: string };
      await redis.srem(`refresh:user:${userId}`, family);
    }
    await redis.del(`refresh:${hashed}`);
  }
  await redis.del(`refresh:family:${family}`);
}

export async function revokeAllUserSessions(userId: string) {
  const families = await redis.smembers(`refresh:user:${userId}`);
  await Promise.all(families.map(revokeFamily));
  await redis.del(`refresh:user:${userId}`);
}

export async function revokeRefreshToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  const stored = await redis.get(`refresh:${hashed}`);
  if (stored) {
    const { family } = JSON.parse(stored) as { family: string };
    await revokeFamily(family);
  }
}
