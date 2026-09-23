"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffHasPermission = staffHasPermission;
exports.getStaffPermissions = getStaffPermissions;
const ROLE_PERMISSIONS = {
    MANAGER: ["CREATE_SALE", "CREATE_CUSTOMER"],
    CASHIER: ["CREATE_SALE", "CREATE_CUSTOMER"],
    SALES_REP: ["CREATE_SALE", "CREATE_CUSTOMER"],
    INVENTORY_CLERK: [],
};
function staffHasPermission(role, permission) {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
function getStaffPermissions(role) {
    return ROLE_PERMISSIONS[role] ?? [];
}
