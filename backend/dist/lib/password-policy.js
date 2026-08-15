"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertStrongPassword = assertStrongPassword;
const errors_1 = require("./errors");
function assertStrongPassword(password) {
    const checks = [
        [password.length >= 12, "at least 12 characters"],
        [/[A-Z]/.test(password), "one uppercase letter"],
        [/[a-z]/.test(password), "one lowercase letter"],
        [/\d/.test(password), "one number"],
        [/[^A-Za-z0-9]/.test(password), "one symbol"],
    ];
    const unmet = checks
        .filter(([passed]) => !passed)
        .map(([, requirement]) => requirement);
    if (unmet.length) {
        throw new errors_1.AppError(`Password must contain ${unmet.join(", ")}.`, 400);
    }
}
