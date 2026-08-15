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
const family_validator_1 = require("../validators/family.validator");
const familyController = __importStar(require("../controllers/family.controller"));
const router = (0, express_1.Router)();
// Public — no auth, since the invitee isn't logged in yet
router.get("/family/invites/:token", familyController.getInvite);
router.post("/family/invites/accept", (0, validate_middleware_1.validate)(family_validator_1.acceptInviteSchema), familyController.acceptInvite);
router.use(auth_middleware_1.requireAuth);
router.get("/family/dashboard", familyController.getDashboard);
router.post("/family/members", (0, validate_middleware_1.validate)(family_validator_1.createMemberSchema), familyController.createMember);
router.patch("/family/members/:id", (0, validate_middleware_1.validate)(family_validator_1.updateMemberSchema), familyController.updateMember);
router.delete("/family/members/:id", familyController.deleteMember);
router.post("/family/controls", (0, validate_middleware_1.validate)(family_validator_1.createControlSchema), familyController.createControl);
router.patch("/family/controls/:id", (0, validate_middleware_1.validate)(family_validator_1.updateControlSchema), familyController.updateControl);
router.delete("/family/controls/:id", familyController.deleteControl);
router.post("/family/invites", (0, validate_middleware_1.validate)(family_validator_1.createInviteSchema), familyController.createInvite);
router.delete("/family/invites/:id", familyController.revokeInvite);
exports.default = router;
