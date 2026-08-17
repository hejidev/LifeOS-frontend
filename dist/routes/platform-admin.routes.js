"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const platformAdminController = __importStar(require("../controllers/platform-admin.controller"));
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const admin_management_validator_1 = require("../validators/admin-management.validator");
const router = (0, express_1.Router)();
router.post("/support/email-change/confirm", (0, validate_middleware_1.validate)(admin_management_validator_1.confirmSupportEmailChangeSchema), platformAdminController.confirmSupportEmailChange);
router.use(auth_middleware_1.requireAuth);
router.use((0, roles_middleware_1.requireRole)("ADMIN", "SUPER_ADMIN"));
router.get("/users", (0, permission_middleware_1.requirePermission)("MANAGE_USERS"), platformAdminController.listUsers);
router.get("/my-permissions", platformAdminController.getMyPermissions);
router.patch("/users/:id/toggle-status", (0, permission_middleware_1.requirePermission)("MANAGE_USERS"), platformAdminController.toggleUserStatus);
router.post("/users/:id/support/password-reset", (0, permission_middleware_1.requirePermission)("MANAGE_USERS"), (0, validate_middleware_1.validate)(admin_management_validator_1.supportReasonSchema), platformAdminController.sendSupportPasswordReset);
router.post("/users/:id/support/email-change", (0, permission_middleware_1.requirePermission)("MANAGE_USERS"), (0, validate_middleware_1.validate)(admin_management_validator_1.supportEmailChangeSchema), platformAdminController.requestSupportEmailChange);
router.post("/users/:id/support/reset-two-factor", (0, permission_middleware_1.requirePermission)("MANAGE_USERS"), (0, validate_middleware_1.validate)(admin_management_validator_1.supportReasonSchema), platformAdminController.resetSupportTwoFactor);
router.delete("/users/:id", (0, roles_middleware_1.requireRole)("SUPER_ADMIN"), (0, validate_middleware_1.validate)(admin_management_validator_1.deleteUserSchema), platformAdminController.deleteUser);
router.get("/tenants", platformAdminController.listTenants);
router.get("/billing", platformAdminController.getBillingStats);
router.get("/analytics", platformAdminController.getAnalytics);
router.get("/overview", platformAdminController.getOverview);
router.get("/audit-log", platformAdminController.getAuditLog);
exports.default = router;
