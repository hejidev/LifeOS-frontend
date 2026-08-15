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
exports.getActivity = exports.logActivity = exports.clockIn = exports.deleteStaff = exports.updateStaff = exports.createStaff = exports.listStaff = void 0;
const errors_1 = require("../lib/errors");
const staffService = __importStar(require("../services/staff.service"));
exports.listStaff = (0, errors_1.asyncHandler)(async (req, res) => {
    const staff = await staffService.listStaff(req.user.id);
    return res.json({ staff });
});
exports.createStaff = (0, errors_1.asyncHandler)(async (req, res) => {
    const staff = await staffService.createStaff(req.user.id, req.body);
    return res.status(201).json({ staff });
});
exports.updateStaff = (0, errors_1.asyncHandler)(async (req, res) => {
    const staff = await staffService.updateStaff(req.user.id, req.params.id, req.body);
    return res.json({ staff });
});
exports.deleteStaff = (0, errors_1.asyncHandler)(async (req, res) => {
    await staffService.deleteStaff(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.clockIn = (0, errors_1.asyncHandler)(async (req, res) => {
    const staff = await staffService.clockIn(req.user.id, req.body.staffId, req.body.pin);
    return res.json({ staff });
});
exports.logActivity = (0, errors_1.asyncHandler)(async (req, res) => {
    const activity = await staffService.logActivity(req.user.id, req.params.id, req.body);
    return res.status(201).json({ activity });
});
exports.getActivity = (0, errors_1.asyncHandler)(async (req, res) => {
    const staffId = req.query.staffId;
    const activity = await staffService.getStaffActivity(req.user.id, staffId);
    return res.json({ activity });
});
