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
exports.logout = exports.me = exports.login = void 0;
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const staffAuthService = __importStar(require("../services/staff-auth.service"));
const STAFF_COOKIE = "lifeos_staff_token";
const STAFF_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 12 * 60 * 60 * 1000,
};
exports.login = (0, errors_1.asyncHandler)(async (req, res) => {
    const { storeCode, name, pin } = req.body;
    const result = await staffAuthService.staffLogin(storeCode, name, pin);
    res.cookie(STAFF_COOKIE, result.token, STAFF_COOKIE_OPTIONS);
    return res.json({ staff: result.staff, businessName: result.businessName });
});
exports.me = (0, errors_1.asyncHandler)(async (req, res) => {
    const staff = await prisma_1.prisma.bizStaff.findUnique({ where: { id: req.staff.staffId } });
    if (!staff)
        return res.status(404).json({ error: "Staff not found" });
    const profile = await prisma_1.prisma.bizProfile.findUnique({
        where: { id: req.staff.bizProfileId },
        select: { businessName: true, currency: true },
    });
    const { pinHash: _hash, ...rest } = staff;
    return res.json({
        staff: rest,
        businessName: profile?.businessName,
        currency: profile?.currency ?? "USD",
    });
});
exports.logout = (0, errors_1.asyncHandler)(async (_req, res) => {
    res.clearCookie(STAFF_COOKIE, { path: "/api" });
    return res.status(204).send();
});
