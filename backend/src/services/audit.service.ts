import { prisma } from "../config/prisma";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  description: string
) {
  await prisma.adminAuditLog.create({
    data: { adminId, action: action as any, targetType, targetId, description },
  });
}