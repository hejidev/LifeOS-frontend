import crypto from "crypto";
import { env } from "../config/env";
import { AppError } from "./errors";

const ALGORITHM = "aes-256-gcm";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!cachedKey) {
    const key = Buffer.from(env.ENCRYPTION_KEY ?? "", "hex");
    if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
    cachedKey = key;
  }
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || dataB64 === undefined) throw new Error("malformed payload");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("[crypto] decrypt failed:", (err as Error).message);
    throw new AppError("This secret couldn't be decrypted. Edit the item and save it again.", 500);
  }
}

export function hashSecret(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export function reuseFingerprint(userId: string, password: string): string {
  const key = crypto.createHmac("sha256", getKey()).update("lifeos:vault:reuse").digest();
  return crypto.createHmac("sha256", key).update(`${userId}\u0000${password}`).digest("hex");
}

const COMMON = [
  "password", "passw0rd", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou",
  "abc123", "monkey", "dragon", "football", "secret", "naija", "lifeos",
];

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

function hasSequence(lower: string) {
  for (const sequence of SEQUENCES) {
    for (let index = 0; index <= sequence.length - 4; index += 1) {
      const part = sequence.slice(index, index + 4);
      if (lower.includes(part) || lower.includes([...part].reverse().join(""))) return true;
    }
  }
  return false;
}

export function scorePasswordStrength(password: string): number {
  if (!password) return 0;
  const lower = password.toLowerCase();

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 33;

  const unique = new Set(password).size;
  const effective = Math.min(password.length, unique * 2);
  let bits = effective * Math.log2(Math.max(pool, 2));

  if (COMMON.some((word) => lower.includes(word))) bits = Math.min(bits * 0.5, 30);
  if (hasSequence(lower)) bits *= 0.75;
  if (/(.{2,})\1+/.test(password)) bits *= 0.8;

  return Math.max(0, Math.min(100, Math.round((bits / 80) * 100)));
}

export function strengthLabel(score: number): "weak" | "medium" | "strong" {
  if (score >= 70) return "strong";
  if (score >= 40) return "medium";
  return "weak";
}