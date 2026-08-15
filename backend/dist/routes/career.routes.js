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
const validate_middleware_1 = require("../middlewares/validate.middleware");
const career_validator_1 = require("../validators/career.validator");
const careerController = __importStar(require("../controllers/career.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get("/career/dashboard", careerController.getDashboard);
router.post("/career/goals", (0, validate_middleware_1.validate)(career_validator_1.createGoalSchema), careerController.createGoal);
router.patch("/career/goals/:id", (0, validate_middleware_1.validate)(career_validator_1.updateGoalSchema), careerController.updateGoal);
router.delete("/career/goals/:id", careerController.deleteGoal);
router.post("/career/skills", (0, validate_middleware_1.validate)(career_validator_1.createSkillSchema), careerController.createSkill);
router.patch("/career/skills/:id", (0, validate_middleware_1.validate)(career_validator_1.updateSkillSchema), careerController.updateSkill);
router.delete("/career/skills/:id", careerController.deleteSkill);
router.post("/career/achievements", (0, validate_middleware_1.validate)(career_validator_1.createAchievementSchema), careerController.createAchievement);
router.delete("/career/achievements/:id", careerController.deleteAchievement);
exports.default = router;
