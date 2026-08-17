"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSelfActivity = logSelfActivity;
exports.getSelfActivity = getSelfActivity;
exports.clockOut = clockOut;
exports.getActiveTeammates = getActiveTeammates;
const prisma_1 = require("../config/prisma");
async function logSelfActivity(staffId, bizProfileId, action, description) {
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
    return prisma_1.prisma.bizStaffActivity.create({ data: { staffId, bizProfileId, action: action, description } });
}
async function getSelfActivity(staffId) {
    return prisma_1.prisma.bizStaffActivity.findMany({ where: { staffId }, orderBy: { createdAt: "desc" }, take: 30 });
}
async function clockOut(staffId, bizProfileId) {
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
    return prisma_1.prisma.bizStaffActivity.create({ data: { staffId, bizProfileId, action: "CLOCK_OUT", description: "Clocked out" } });
}
async function getActiveTeammates(staffId, bizProfileId) {
    const since = new Date(Date.now() - 20 * 60 * 1000);
    return prisma_1.prisma.bizStaff.findMany({
        where: { bizProfileId, id: { not: staffId }, status: "ACTIVE", lastActiveAt: { gte: since } },
        select: { id: true, name: true, role: true, lastActiveAt: true },
        orderBy: { lastActiveAt: "desc" },
    });
}
