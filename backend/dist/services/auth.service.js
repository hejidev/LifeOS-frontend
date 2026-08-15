"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.authenticateUser = authenticateUser;
exports.issueSession = issueSession;
exports.refreshSession = refreshSession;
exports.endSession = endSession;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.requestEmailLoginCode = requestEmailLoginCode;
exports.verifyEmailLoginCode = verifyEmailLoginCode;
exports.sanitizeUser = sanitizeUser;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
const errors_1 = require("../lib/errors");
const password_policy_1 = require("../lib/password-policy");
const token_service_1 = require("./token.service");
const email_service_1 = require("./email.service");
const env_1 = require("../config/env");
const logger_1 = require("../lib/logger");
const SALT_ROUNDS = 12;
const DUMMY_HASH = "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval";
const RESET_TTL_SECONDS = 60 * 15; // 15 minutes
const LOGIN_CODE_TTL_SECONDS = 60 * 10;
const LOGIN_CODE_RESEND_SECONDS = 60;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
const sha256 = (value) => crypto_1.default.createHash("sha256").update(value).digest("hex");
const normaliseEmail = (email) => email.trim().toLowerCase();
async function registerUser(input) {
    (0, password_policy_1.assertStrongPassword)(input.password);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
        throw new errors_1.AppError("Email already in use", 409);
    const passwordHash = await bcrypt_1.default.hash(input.password, SALT_ROUNDS);
    const user = await prisma_1.prisma.user.create({
        data: { email: input.email, name: input.name, passwordHash, role: "USER", provider: "CREDENTIALS" },
    });
    return sanitizeUser(user);
}
async function authenticateUser(email, password, meta = {}) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt_1.default.compare(password, user?.passwordHash ?? DUMMY_HASH);
    await prisma_1.prisma.loginAttempt.create({
        data: { email, success: !!user?.passwordHash && isValid, ipAddress: meta.ip, userAgent: meta.userAgent },
    });
    if (!user || !user.passwordHash || !isValid) {
        throw new errors_1.AppError("Invalid email or password", 401);
    }
    if (!user.isActive) {
        throw new errors_1.AppError("Account disabled, contact support", 403);
    }
    return sanitizeUser(user);
}
async function issueSession(userId, role, sessionVersion) {
    const accessToken = (0, token_service_1.signAccessToken)({ sub: userId, role, sv: sessionVersion });
    const { raw: refreshToken } = await (0, token_service_1.issueRefreshToken)(userId, sessionVersion);
    return { accessToken, refreshToken };
}
async function refreshSession(refreshToken) {
    const result = await (0, token_service_1.rotateRefreshToken)(refreshToken);
    if (!result || result === "REUSE_DETECTED") {
        throw new errors_1.AppError("Session expired, please log in again", 401);
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: result.userId } });
    if (!user || !user.isActive || result.sessionVersion !== user.sessionVersion) {
        throw new errors_1.AppError("Session expired, please log in again", 401);
    }
    const accessToken = (0, token_service_1.signAccessToken)({ sub: user.id, role: user.role, sv: user.sessionVersion });
    return { accessToken, refreshToken: result.raw, user: sanitizeUser(user) };
}
async function endSession(refreshToken) {
    await (0, token_service_1.revokeRefreshToken)(refreshToken);
}
async function forgotPassword(email) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
        return;
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const hashed = crypto_1.default.createHash("sha256").update(token).digest("hex");
    await redis_1.redis.set(`reset:${hashed}`, user.id, "EX", RESET_TTL_SECONDS);
    const resetLink = `${env_1.env.FRONTEND_URL}/reset-password?token=${token}`;
    if (env_1.env.NODE_ENV === "development") {
        logger_1.logger.info(`[dev] reset link for ${email} → ${resetLink}`);
    }
    await (0, email_service_1.sendPasswordResetEmail)(email, resetLink);
}
async function resetPassword(token, newPassword) {
    (0, password_policy_1.assertStrongPassword)(newPassword);
    const hashed = crypto_1.default.createHash("sha256").update(token).digest("hex");
    const userId = await redis_1.redis.get(`reset:${hashed}`);
    if (!userId)
        throw new errors_1.AppError("Reset link is invalid or has expired", 400);
    const passwordHash = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await redis_1.redis.del(`reset:${hashed}`);
}
async function requestEmailLoginCode(emailInput) {
    const email = normaliseEmail(emailInput);
    const cooldownKey = `login-code:cooldown:${sha256(email)}`;
    if (await redis_1.redis.get(cooldownKey)) {
        throw new errors_1.AppError("Please wait before requesting another code.", 429);
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    // Do not disclose whether this email is registered.
    if (!user || !user.isActive) {
        return { message: "If an eligible account exists, a code has been sent." };
    }
    const code = crypto_1.default.randomInt(100000, 1000000).toString();
    const challengeId = crypto_1.default.randomUUID();
    await Promise.all([
        redis_1.redis.set(`login-code:${challengeId}`, JSON.stringify({ userId: user.id, codeHash: sha256(code), attempts: 0 }), "EX", LOGIN_CODE_TTL_SECONDS),
        redis_1.redis.set(cooldownKey, "1", "EX", LOGIN_CODE_RESEND_SECONDS),
    ]);
    await (0, email_service_1.sendLoginCodeEmail)(user.email, code);
    return { message: "If an eligible account exists, a code has been sent.", challengeId };
}
async function verifyEmailLoginCode(challengeId, code) {
    const key = `login-code:${challengeId}`;
    const stored = await redis_1.redis.get(key);
    if (!stored)
        throw new errors_1.AppError("This code has expired. Request a new one.", 401);
    const challenge = JSON.parse(stored);
    if (challenge.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
        await redis_1.redis.del(key);
        throw new errors_1.AppError("Too many incorrect attempts. Request a new code.", 429);
    }
    if (sha256(code) !== challenge.codeHash) {
        challenge.attempts += 1;
        await redis_1.redis.set(key, JSON.stringify(challenge), "KEEPTTL");
        throw new errors_1.AppError("Incorrect code.", 401);
    }
    await redis_1.redis.del(key);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user || !user.isActive)
        throw new errors_1.AppError("Account unavailable.", 401);
    return user;
}
function sanitizeUser(user) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, sessionVersion: user.sessionVersion };
}
