import crypto from "crypto";
import { env } from "../../config/env";
import { redis } from "../../config/redis";

export async function createGoogleAuthUrl() {
  const state = crypto.randomBytes(24).toString("hex");
  await redis.set(`oauth:state:${state}`, "1", "EX", 5 * 60);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: ["openid", "email", "profile"].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function verifyGoogleState(state: string | undefined) {
  if (!state) return false;
  const key = `oauth:state:${state}`;
  const exists = await redis.get(key);
  if (exists) await redis.del(key);
  return Boolean(exists);
}

export async function exchangeCodeForGoogleUser(code: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error("Failed to exchange code for token");
  const tokenData = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) throw new Error("Failed to fetch Google profile");

  const profile = (await userRes.json()) as { sub: string; email: string; name?: string; given_name?: string };

  return {
    providerId: profile.sub,
    email: profile.email,
    name: profile.name || profile.given_name || profile.email.split("@")[0],
  };
}
