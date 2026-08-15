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
exports.getMyPermissions = exports.getAnalytics = exports.getBillingStats = exports.listTenants = exports.getAuditLog = exports.getOverview = exports.deleteUser = exports.resetSupportTwoFactor = exports.confirmSupportEmailChange = exports.requestSupportEmailChange = exports.sendSupportPasswordReset = exports.toggleUserStatus = exports.listUsers = void 0;
const errors_1 = require("../lib/errors");
const platformAdminService = __importStar(require("../services/platform-admin.service"));
exports.listUsers = (0, errors_1.asyncHandler)(async (req, res) => {
    const search = req.query.search;
    const users = await platformAdminService.listUsers(search);
    return res.json({ users });
});
exports.toggleUserStatus = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await platformAdminService.toggleUserStatus(req.user.id, req.params.id);
    return res.json({ user });
});
exports.sendSupportPasswordReset = (0, errors_1.asyncHandler)(async (req, res) => {
    await platformAdminService.sendSupportPasswordReset(req.user.id, req.params.id, req.body.reason);
    return res.status(204).send();
});
exports.requestSupportEmailChange = (0, errors_1.asyncHandler)(async (req, res) => {
    await platformAdminService.requestSupportEmailChange(req.user.id, req.params.id, req.body.email, req.body.reason);
    return res.status(204).send();
});
exports.confirmSupportEmailChange = (0, errors_1.asyncHandler)(async (req, res) => {
    await platformAdminService.confirmSupportEmailChange(req.body.token);
    return res.status(204).send();
});
exports.resetSupportTwoFactor = (0, errors_1.asyncHandler)(async (req, res) => {
    await platformAdminService.resetSupportTwoFactor(req.user.id, req.params.id, req.body.reason);
    return res.status(204).send();
});
exports.deleteUser = (0, errors_1.asyncHandler)(async (req, res) => {
    await platformAdminService.deleteUser(req.user.id, req.params.id, req.body.confirmationEmail, req.body.reason);
    return res.status(204).send();
});
exports.getOverview = (0, errors_1.asyncHandler)(async (_req, res) => {
    const overview = await platformAdminService.getOverview();
    return res.json(overview);
});
exports.getAuditLog = (0, errors_1.asyncHandler)(async (_req, res) => {
    const logs = await platformAdminService.getAuditLog();
    return res.json({ logs });
});
exports.listTenants = (0, errors_1.asyncHandler)(async (_req, res) => {
    const tenants = await platformAdminService.listTenants();
    return res.json({ tenants });
});
exports.getBillingStats = (0, errors_1.asyncHandler)(async (_req, res) => {
    const stats = await platformAdminService.getBillingStats();
    return res.json(stats);
});
exports.getAnalytics = (0, errors_1.asyncHandler)(async (_req, res) => {
    const analytics = await platformAdminService.getAnalytics();
    return res.json(analytics);
});
exports.getMyPermissions = (0, errors_1.asyncHandler)(async (req, res) => {
    return res.json(await platformAdminService.getMyPermissions(req.user.id, req.user.role));
});
