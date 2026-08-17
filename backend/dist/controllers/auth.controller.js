"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLoginCode = exports.requestLoginCode = exports.me = exports.logout = exports.resetPassword = exports.forgotPassword = exports.verifyTwoFactor = exports.refresh = exports.login = exports.register = void 0;
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const twoFactorService = __importStar(require("../services/two-factor.service"));
const authService = __importStar(require("../services/auth.service"));
const isProd = env_1.env.NODE_ENV !== "development";
const REFRESH_COOKIE = "lifeos_rt";
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
};
const FLAG_COOKIE_OPTIONS = {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
};
function setSessionCookies(res, refreshToken, role) {
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie("lifeos_authed", "1", FLAG_COOKIE_OPTIONS);
    res.cookie("lifeos_role", role, FLAG_COOKIE_OPTIONS);
}
function sendRefreshCookie(res, refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
}
function createPendingTwoFactorToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId, purpose: "2fa_pending" }, env_1.env.ACCESS_TOKEN_SECRET, { expiresIn: 300 });
}
exports.register = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await authService.registerUser(req.body);
    return res.status(201).json({ user });
});
exports.login = (0, errors_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.authenticateUser(email, password, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });
    const fullUser = await prisma_1.prisma.user.findUnique({ where: { id: user.id } });
    if (fullUser?.twoFactorEnabled) {
        const pendingToken = jsonwebtoken_1.default.sign({ sub: user.id, purpose: "2fa_pending" }, env_1.env.ACCESS_TOKEN_SECRET, { expiresIn: 300 });
        return res.status(200).json({ requires2FA: true, pendingToken });
    }
    const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
    setSessionCookies(res, refreshToken, user.role);
    return res.status(200).json({ accessToken, user });
});
exports.refresh = (0, errors_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token)
        throw new errors_1.AppError("Not authenticated", 401);
    const { accessToken, refreshToken, user } = await authService.refreshSession(token);
    setSessionCookies(res, refreshToken, user.role);
    return res.status(200).json({ accessToken, user });
});
exports.verifyTwoFactor = (0, errors_1.asyncHandler)(async (req, res) => {
    const { pendingToken, code } = req.body;
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(pendingToken, env_1.env.ACCESS_TOKEN_SECRET);
    }
    catch {
        throw new errors_1.AppError("This code has expired, please log in again", 401);
    }
    if (payload.purpose !== "2fa_pending")
        throw new errors_1.AppError("Invalid request", 400);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.twoFactorSecret)
        throw new errors_1.AppError("Invalid request", 400);
    const valid = await twoFactorService.verifyCode(user.twoFactorSecret, code);
    if (!valid)
        throw new errors_1.AppError("Incorrect code", 401);
    const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
    setSessionCookies(res, refreshToken, user.role);
    return res.status(200).json({ accessToken, user: authService.sanitizeUser(user) });
});
exports.forgotPassword = (0, errors_1.asyncHandler)(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    return res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
});
exports.resetPassword = (0, errors_1.asyncHandler)(async (req, res) => {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    return res.status(200).json({ message: "Password updated successfully." });
});
exports.logout = (0, errors_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token)
        await authService.endSession(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
    res.clearCookie("lifeos_authed", { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
    res.clearCookie("lifeos_role", { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
    return res.status(204).send();
});
exports.me = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.status(200).json({ user: req.user });
});
exports.requestLoginCode = (0, errors_1.asyncHandler)(async (req, res) => {
    const result = await authService.requestEmailLoginCode(req.body.email);
    return res.status(200).json(result);
});
exports.verifyLoginCode = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await authService.verifyEmailLoginCode(req.body.challengeId, req.body.code);
    if (user.twoFactorEnabled) {
        return res.status(200).json({
            requires2FA: true,
            pendingToken: createPendingTwoFactorToken(user.id),
        });
    }
    const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
    sendRefreshCookie(res, refreshToken);
    return res.status(200).json({ accessToken, user: authService.sanitizeUser(user) });
});
