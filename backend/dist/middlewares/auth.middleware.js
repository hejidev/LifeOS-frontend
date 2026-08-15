"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const token_service_1 = require("../services/token.service");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function requireAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return next(new errors_1.AppError("Not authenticated", 401));
        }
        const token = authHeader.substring(7);
        const payload = (0, token_service_1.verifyAccessToken)(token);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return next(new errors_1.AppError("User not found", 401));
        if (!user.isActive)
            return next(new errors_1.AppError("Account disabled", 401));
        if (payload.sv !== user.sessionVersion)
            return next(new errors_1.AppError("Session revoked, please log in again", 401));
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
        next();
    }
    catch {
        next(new errors_1.AppError("Invalid or expired session", 401));
    }
}
