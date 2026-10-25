"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMerchantAllowPaused = exports.requireMerchant = void 0;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function guard(allowPaused) {
    return async (req, _res, next) => {
        try {
            const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId: req.user.id } });
            if (!profile)
                throw new errors_1.AppError("You need to apply as a merchant before accessing the business dashboard", 403);
            if (profile.status === "PENDING")
                throw new errors_1.AppError("Your merchant application is still under review", 403);
            if (profile.status === "REJECTED")
                throw new errors_1.AppError("Your merchant application was not approved", 403);
            if (profile.status === "SUSPENDED")
                throw new errors_1.AppError("Your merchant account has been suspended", 403);
            if (profile.planStatus !== "ACTIVE")
                throw new errors_1.AppError("Choose a merchant plan to activate your dashboard", 402);
            if (!allowPaused && profile.paused) {
                throw new errors_1.AppError("Your store is currently paused. Reactivate it in Settings.", 403);
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
exports.requireMerchant = guard(false);
exports.requireMerchantAllowPaused = guard(true);
