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
exports.sendBroadcast = exports.getAdmins = exports.revokePermission = exports.grantPermission = exports.createAdmin = exports.changeRole = void 0;
const errors_1 = require("../lib/errors");
const adminManagementService = __importStar(require("../services/admin-management.service"));
exports.changeRole = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await adminManagementService.changeUserRole(req.user.id, req.params.id, req.body.role);
    return res.json({ user });
});
exports.createAdmin = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await adminManagementService.createAdmin(req.user.id, req.body);
    return res.status(201).json({ user });
});
exports.grantPermission = (0, errors_1.asyncHandler)(async (req, res) => {
    await adminManagementService.grantPermission(req.user.id, req.params.id, req.body.capability);
    return res.status(204).send();
});
exports.revokePermission = (0, errors_1.asyncHandler)(async (req, res) => {
    await adminManagementService.revokePermission(req.user.id, req.params.id, req.body.capability);
    return res.status(204).send();
});
exports.getAdmins = (0, errors_1.asyncHandler)(async (_req, res) => {
    const admins = await adminManagementService.getAdmins();
    return res.json({ admins });
});
exports.sendBroadcast = (0, errors_1.asyncHandler)(async (req, res) => {
    const result = await adminManagementService.sendBroadcast(req.user.id, req.body);
    return res.json(result);
});
