"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaffPermission = requireStaffPermission;
const errors_1 = require("../lib/errors");
const staff_permissions_1 = require("../lib/staff-permissions");
function requireStaffPermission(permission) {
    return (req, _res, next) => {
        const role = req.staff?.role;
        if (!role || !(0, staff_permissions_1.staffHasPermission)(role, permission)) {
            return next(new errors_1.AppError("Your role doesn't have access to this action", 403));
        }
        next();
    };
}
