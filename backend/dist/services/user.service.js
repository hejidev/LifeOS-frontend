"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.uploadAvatar = uploadAvatar;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const auth_service_1 = require("./auth.service");
const cloudinary_1 = require("../config/cloudinary");
const SALT_ROUNDS = 12;
async function getProfile(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    return (0, auth_service_1.sanitizeUser)(user);
}
async function updateProfile(userId, data) {
    const user = await prisma_1.prisma.user.update({ where: { id: userId }, data });
    return (0, auth_service_1.sanitizeUser)(user);
}
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
        throw new errors_1.AppError("Password change unavailable for this account", 400);
    }
    const isValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
    if (!isValid)
        throw new errors_1.AppError("Current password is incorrect", 401);
    const passwordHash = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
async function uploadAvatar(userId, fileBuffer) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: "lifeos/avatars", public_id: userId, overwrite: true, resource_type: "image" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(fileBuffer);
    });
    const user = await prisma_1.prisma.user.update({ where: { id: userId }, data: { avatarUrl: uploaded.secure_url } });
    return (0, auth_service_1.sanitizeUser)(user);
}
