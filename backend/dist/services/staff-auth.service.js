"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffLogin = staffLogin;
exports.verifyStaffToken = verifyStaffToken;
exports.generateStoreCode = generateStoreCode;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const notification_service_1 = require("./notification.service");
const STAFF_TOKEN_TTL_SECONDS = 12 * 60 * 60;
async function staffLogin(storeCode, staffName, pin) {
    const bizProfile = await prisma_1.prisma.bizProfile.findUnique({ where: { staffLoginCode: storeCode } });
    if (!bizProfile)
        throw new errors_1.AppError("Invalid store code", 404);
    if (bizProfile.status !== "APPROVED" || bizProfile.planStatus !== "ACTIVE") {
        throw new errors_1.AppError("This store isn't currently active", 403);
    }
    const staffList = await prisma_1.prisma.bizStaff.findMany({ where: { bizProfileId: bizProfile.id, status: "ACTIVE" } });
    const candidate = staffList.find((s) => s.name.toLowerCase() === staffName.toLowerCase());
    if (!candidate)
        throw new errors_1.AppError("Incorrect name or PIN", 401);
    const valid = await bcrypt_1.default.compare(pin, candidate.pinHash);
    if (!valid)
        throw new errors_1.AppError("Incorrect name or PIN", 401);
    const token = jsonwebtoken_1.default.sign({ type: "staff", staffId: candidate.id, bizProfileId: bizProfile.id, role: candidate.role, tokenVersion: bizProfile.staffTokenVersion }, env_1.env.ACCESS_TOKEN_SECRET, { expiresIn: STAFF_TOKEN_TTL_SECONDS });
    const now = new Date();
    await prisma_1.prisma.bizStaff.update({ where: { id: candidate.id }, data: { lastActiveAt: now } });
    await prisma_1.prisma.bizStaffActivity.create({
        data: { staffId: candidate.id, bizProfileId: bizProfile.id, action: "LOGIN", description: `${candidate.name} logged in` },
    });
    await (0, notification_service_1.createNotification)(bizProfile.userId, {
        type: "STAFF",
        title: "Staff clocked in",
        message: `${candidate.name} (${candidate.role.replace("_", " ").toLowerCase()}) clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        actionUrl: "/merchant/staff/activity",
    });
    return { token, staff: { id: candidate.id, name: candidate.name, role: candidate.role }, businessName: bizProfile.businessName };
}
function verifyStaffToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET);
    if (payload.type !== "staff")
        throw new errors_1.AppError("Invalid staff session", 401);
    return payload;
}
function generateStoreCode() {
    return crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
}
