import { prisma } from "../config/prisma";

export async function logSelfActivity(staffId: string, bizProfileId: string, action: string, description: string) {
  await prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
  return prisma.bizStaffActivity.create({ data: { staffId, bizProfileId, action: action as any, description } });
}

export async function getSelfActivity(staffId: string) {
  return prisma.bizStaffActivity.findMany({ where: { staffId }, orderBy: { createdAt: "desc" }, take: 30 });
}

export async function clockOut(staffId: string, bizProfileId: string) {
  await prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
  return prisma.bizStaffActivity.create({ data: { staffId, bizProfileId, action: "CLOCK_OUT" as any, description: "Clocked out" } });
}

export async function getActiveTeammates(staffId: string, bizProfileId: string) {
  const since = new Date(Date.now() - 20 * 60 * 1000);
  return prisma.bizStaff.findMany({
    where: { bizProfileId, id: { not: staffId }, status: "ACTIVE", lastActiveAt: { gte: since } },
    select: { id: true, name: true, role: true, lastActiveAt: true },
    orderBy: { lastActiveAt: "desc" },
  });
}