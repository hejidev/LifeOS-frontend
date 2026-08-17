"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGoogleAuthUrl = createGoogleAuthUrl;
exports.verifyGoogleState = verifyGoogleState;
exports.exchangeCodeForGoogleUser = exchangeCodeForGoogleUser;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const redis_1 = require("../../config/redis");
async function createGoogleAuthUrl() {
    const state = crypto_1.default.randomBytes(24).toString("hex");
    await redis_1.redis.set(`oauth:state:${state}`, "1", "EX", 5 * 60);
    const params = new URLSearchParams({
        client_id: env_1.env.GOOGLE_CLIENT_ID,
        redirect_uri: env_1.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: ["openid", "email", "profile"].join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
async function verifyGoogleState(state) {
    if (!state)
        return false;
    const key = `oauth:state:${state}`;
    const exists = await redis_1.redis.get(key);
    if (exists)
        await redis_1.redis.del(key);
    return Boolean(exists);
}
async function exchangeCodeForGoogleUser(code) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env_1.env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code",
        }).toString(),
    });
    if (!tokenRes.ok)
        throw new Error("Failed to exchange code for token");
    const tokenData = (await tokenRes.json());
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok)
        throw new Error("Failed to fetch Google profile");
    const profile = (await userRes.json());
    return {
        providerId: profile.sub,
        email: profile.email,
        name: profile.name || profile.given_name || profile.email.split("@")[0],
    };
}
