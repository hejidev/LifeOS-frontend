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
const rate_limit_1 = require("../lib/rate-limit");
const utilitiesController = __importStar(require("../controllers/utilities.controller"));
const utilities_validator_1 = require("../validators/utilities.validator");
const social_profile_validator_1 = require("../validators/social-profile.validator");
const router = (0, express_1.Router)();
router.get("/utilities/exchange-rates", auth_middleware_1.requireAuth, (0, rate_limit_1.rateLimitUser)("fx", 60, 60, "You're checking rates too quickly."), utilitiesController.getExchangeRates);
router.post("/utilities/translate", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(utilities_validator_1.translateSchema), (0, rate_limit_1.rateLimitUser)("translate", 15, 60, "You're translating too quickly."), (0, rate_limit_1.rateLimitUser)("translate-day", 200, 86400, "You've reached today's translation limit."), utilitiesController.translateText);
router.get("/social-profile/me", auth_middleware_1.requireAuth, utilitiesController.getMySocialProfile);
router.post("/utilities/social-profile", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(social_profile_validator_1.createSocialProfileSchema), utilitiesController.createSocialProfile);
router.patch("/utilities/social-profile", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(social_profile_validator_1.updateSocialProfileSchema), utilitiesController.updateSocialProfile);
router.delete("/utilities/social-profile", auth_middleware_1.requireAuth, utilitiesController.deleteSocialProfile);
exports.default = router;
