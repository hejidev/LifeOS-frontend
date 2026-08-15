"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminAction = logAdminAction;
const prisma_1 = require("../config/prisma");
async function logAdminAction(adminId, action, targetType, targetId, description) {
    await prisma_1.prisma.adminAuditLog.create({
        data: { adminId, action: action, targetType, targetId, description },
    });
}
