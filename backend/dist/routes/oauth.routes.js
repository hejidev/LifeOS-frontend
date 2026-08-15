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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const googleService = __importStar(require("../services/oauth/google.service"));
const authService = __importStar(require("../services/auth.service"));
const REFRESH_COOKIE = "lifeos_rt";
const router = (0, express_1.Router)();
router.get("/auth/google", (0, errors_1.asyncHandler)(async (_req, res) => {
    const url = await googleService.createGoogleAuthUrl();
    res.redirect(url);
}));
router.get("/auth/google/callback", (0, errors_1.asyncHandler)(async (req, res) => {
    const { code, state } = req.query;
    const stateOk = await googleService.verifyGoogleState(state);
    if (!code || !stateOk)
        throw new errors_1.AppError("Invalid OAuth state", 400);
    const googleUser = await googleService.exchangeCodeForGoogleUser(code);
    let user = await prisma_1.prisma.user.findUnique({ where: { email: googleUser.email } });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                email: googleUser.email,
                name: googleUser.name,
                role: "USER",
                provider: "GOOGLE",
                providerId: googleUser.providerId,
                emailVerified: true,
            },
        });
    }
    const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
    res.cookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    // Access token rides a one-time redirect; the frontend exchanges it
    // for session state immediately and the URL never gets bookmarked/shared.
    res.redirect(`${env_1.env.FRONTEND_URL}/oauth/callback?accessToken=${accessToken}`);
}));
exports.default = router;
