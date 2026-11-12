"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const token_service_1 = require("../services/token.service");
const auth_cache_1 = require("../lib/auth-cache");
const errors_1 = require("../lib/errors");
async function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next(new errors_1.AppError("Not authenticated", 401));
    }
    let payload;
    try {
        payload = (0, token_service_1.verifyAccessToken)(authHeader.substring(7));
    }
    catch {
        return next(new errors_1.AppError("Invalid or expired session", 401));
    }
    try {
        const user = await (0, auth_cache_1.loadAuthUser)(payload.sub);
        if (!user)
            return next(new errors_1.AppError("User not found", 401));
        if (!user.isActive)
            return next(new errors_1.AppError("Account disabled", 401));
        if (payload.sv !== user.sessionVersion)
            return next(new errors_1.AppError("Session revoked, please log in again", 401));
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
        next();
    }
    catch (err) {
        next(err);
    }
}
