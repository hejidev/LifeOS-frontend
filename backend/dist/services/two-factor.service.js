"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecret = generateSecret;
exports.enableTwoFactor = enableTwoFactor;
exports.disableTwoFactor = disableTwoFactor;
exports.verifyCode = verifyCode;
exports.getStatus = getStatus;
const otplib_1 = require("otplib");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function buildOtpauthUri(email, secret) {
    const issuer = "LifeOS";
    const label = encodeURIComponent(`${issuer}:${email}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
async function generateSecret(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    const secret = (0, otplib_1.generateSecret)();
    const otpauth = buildOtpauthUri(user.email, secret);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    return { otpauth };
}
async function enableTwoFactor(userId, code) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret)
        throw new errors_1.AppError("Set up 2FA first", 400);
    const result = await (0, otplib_1.verify)({ secret: user.twoFactorSecret, token: code });
    if (!result.valid)
        throw new errors_1.AppError("Invalid code", 401);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}
async function disableTwoFactor(userId, password, code) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
        throw new errors_1.AppError("Two-factor authentication is not enabled", 400);
    }
    if (!user.passwordHash) {
        throw new errors_1.AppError("Password confirmation is unavailable for this account", 400);
    }
    if (!(await bcrypt_1.default.compare(password, user.passwordHash))) {
        throw new errors_1.AppError("Current password is incorrect", 401);
    }
    if (!(await verifyCode(user.twoFactorSecret, code))) {
        throw new errors_1.AppError("Invalid authentication code", 401);
    }
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: { increment: 1 } },
    });
}
async function verifyCode(secret, code) {
    const result = await (0, otplib_1.verify)({ secret, token: code });
    return result.valid;
}
async function getStatus(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    return { enabled: user?.twoFactorEnabled ?? false };
}
