"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaffSession = requireStaffSession;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
async function requireStaffSession(req, _res, next) {
    try {
        const token = req.cookies?.lifeos_staff_token;
        if (!token) {
            console.error("[staff-session] no lifeos_staff_token cookie on", req.method, req.path);
            return next(new errors_1.AppError("Not logged in as staff", 401));
        }
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET);
        if (payload.type !== "staff") {
            console.error("[staff-session] token type mismatch:", payload.type);
            return next(new errors_1.AppError("Invalid staff session", 401));
        }
        const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: payload.bizProfileId } });
        if (!profile) {
            console.error("[staff-session] no bizProfile found for id", payload.bizProfileId);
            return next(new errors_1.AppError("Staff session expired, please log in again", 401));
        }
        if (profile.staffTokenVersion !== payload.tokenVersion) {
            console.error("[staff-session] token version mismatch — token has", payload.tokenVersion, "db has", profile.staffTokenVersion);
            return next(new errors_1.AppError("Staff session expired, please log in again", 401));
        }
        req.staff = { staffId: payload.staffId, bizProfileId: payload.bizProfileId, role: payload.role };
        next();
    }
    catch (err) {
        console.error("[staff-session] verify error:", err);
        next(new errors_1.AppError("Invalid staff session", 401));
    }
}
