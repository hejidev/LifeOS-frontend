import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { sanitizeUser } from "./auth.service";
import { cloudinary } from "../config/cloudinary";

const SALT_ROUNDS = 12;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
}

export async function updateProfile(userId: string, data: { name?: string }) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return sanitizeUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new AppError("Password change unavailable for this account", 400);
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function uploadAvatar(userId: string, fileBuffer: Buffer) {
  const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "lifeos/avatars", public_id: userId, overwrite: true, resource_type: "image" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(fileBuffer);
  });

  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl: uploaded.secure_url } });
  return sanitizeUser(user);
}