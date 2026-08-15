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
exports.acceptInvite = exports.getInvite = exports.revokeInvite = exports.createInvite = exports.deleteControl = exports.updateControl = exports.createControl = exports.deleteMember = exports.updateMember = exports.createMember = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const familyService = __importStar(require("../services/family.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const data = await familyService.getFamilyDashboard(req.user.id);
    return res.json(data);
});
exports.createMember = (0, errors_1.asyncHandler)(async (req, res) => {
    const member = await familyService.createMember(req.user.id, req.body);
    return res.status(201).json({ member });
});
exports.updateMember = (0, errors_1.asyncHandler)(async (req, res) => {
    const member = await familyService.updateMember(req.user.id, req.params.id, req.body);
    return res.json({ member });
});
exports.deleteMember = (0, errors_1.asyncHandler)(async (req, res) => {
    await familyService.deleteMember(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.createControl = (0, errors_1.asyncHandler)(async (req, res) => {
    const control = await familyService.createControl(req.user.id, req.body);
    return res.status(201).json({ control });
});
exports.updateControl = (0, errors_1.asyncHandler)(async (req, res) => {
    const control = await familyService.updateControl(req.user.id, req.params.id, req.body);
    return res.json({ control });
});
exports.deleteControl = (0, errors_1.asyncHandler)(async (req, res) => {
    await familyService.deleteControl(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.createInvite = (0, errors_1.asyncHandler)(async (req, res) => {
    const invite = await familyService.createInvite(req.user.id, req.user.name ?? "A family member", req.body);
    return res.status(201).json({ invite });
});
exports.revokeInvite = (0, errors_1.asyncHandler)(async (req, res) => {
    await familyService.revokeInvite(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.getInvite = (0, errors_1.asyncHandler)(async (req, res) => {
    const invite = await familyService.getInviteByToken(req.params.token);
    return res.json({ invite });
});
exports.acceptInvite = (0, errors_1.asyncHandler)(async (req, res) => {
    const member = await familyService.acceptInvite(req.body.token, req.body.name);
    return res.status(201).json({ member });
});
