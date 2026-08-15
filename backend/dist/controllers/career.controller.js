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
exports.deleteAchievement = exports.createAchievement = exports.deleteSkill = exports.updateSkill = exports.createSkill = exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const careerService = __importStar(require("../services/career.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const data = await careerService.getCareerDashboard(req.user.id);
    return res.json(data);
});
exports.createGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await careerService.createGoal(req.user.id, req.body);
    return res.status(201).json({ goal });
});
exports.updateGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await careerService.updateGoal(req.user.id, req.params.id, req.body);
    return res.json({ goal });
});
exports.deleteGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    await careerService.deleteGoal(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.createSkill = (0, errors_1.asyncHandler)(async (req, res) => {
    const skill = await careerService.createSkill(req.user.id, req.body);
    return res.status(201).json({ skill });
});
exports.updateSkill = (0, errors_1.asyncHandler)(async (req, res) => {
    const skill = await careerService.updateSkill(req.user.id, req.params.id, req.body);
    return res.json({ skill });
});
exports.deleteSkill = (0, errors_1.asyncHandler)(async (req, res) => {
    await careerService.deleteSkill(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.createAchievement = (0, errors_1.asyncHandler)(async (req, res) => {
    const achievement = await careerService.createAchievement(req.user.id, req.body);
    return res.status(201).json({ achievement });
});
exports.deleteAchievement = (0, errors_1.asyncHandler)(async (req, res) => {
    await careerService.deleteAchievement(req.user.id, req.params.id);
    return res.status(204).send();
});
