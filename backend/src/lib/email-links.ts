import crypto from "crypto";
import { env } from "../config/env";

const secret = () => process.env.EMAIL_LINK_SECRET || env.ENCRYPTION_KEY;

export const apiPublicUrl = () => (process.env.API_PUBLIC_URL || "https://api.lifeos.com.ng").replace(/\/+$/, "");

export function unsubscribeToken(userId: string, list: string) {
  return crypto.createHmac("sha256", secret()).update(`unsubscribe:${list}:${userId}`).digest("base64url");
}

export function verifyUnsubscribeToken(userId: string, list: string, token: string) {
  const expected = Buffer.from(unsubscribeToken(userId, list));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string, list: string) {
  return `${apiPublicUrl()}/api/public/unsubscribe/${list}?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId, list)}`;
}