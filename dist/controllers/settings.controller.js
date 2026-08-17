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
exports.deactivateAccount = exports.getAccountOverview = exports.changePassword = exports.updateNotifications = exports.updatePreferences = exports.updateProfile = exports.getProfile = void 0;
const errors_1 = require("../lib/errors");
const settingsService = __importStar(require("../services/settings.service"));
exports.getProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await settingsService.getProfile(req.user.id);
    return res.json({ user: profile });
});
exports.updateProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await settingsService.updateProfile(req.user.id, req.body);
    return res.json({ user: profile });
});
exports.updatePreferences = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await settingsService.updatePreferences(req.user.id, req.body);
    return res.json({ user: profile });
});
exports.updateNotifications = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await settingsService.updateNotifications(req.user.id, req.body);
    return res.json({ user: profile });
});
exports.changePassword = (0, errors_1.asyncHandler)(async (req, res) => {
    await settingsService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    return res.json({ success: true });
});
exports.getAccountOverview = (0, errors_1.asyncHandler)(async (req, res) => {
    const overview = await settingsService.getAccountOverview(req.user.id);
    return res.json(overview);
});
exports.deactivateAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    await settingsService.deactivateAccount(req.user.id);
    return res.status(204).send();
});
