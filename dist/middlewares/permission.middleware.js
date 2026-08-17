"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function requirePermission(capability) {
    return async (req, _res, next) => {
        try {
            if (req.user.role === "SUPER_ADMIN")
                return next();
            if (req.user.role !== "ADMIN")
                throw new errors_1.AppError("Forbidden", 403);
            const has = await prisma_1.prisma.adminPermission.findUnique({
                where: { userId_capability: { userId: req.user.id, capability: capability } },
            });
            if (!has)
                throw new errors_1.AppError("You don't have permission to perform this action", 403);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
