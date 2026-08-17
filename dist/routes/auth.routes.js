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
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const rateLimiter_middleware_1 = require("../middlewares/rateLimiter.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const authController = __importStar(require("../controllers/auth.controller"));
const router = (0, express_1.Router)();
router.post("/auth/register", rateLimiter_middleware_1.registerRateLimiter, (0, validate_middleware_1.validate)(auth_validator_1.registerSchema), authController.register);
router.post("/auth/login", rateLimiter_middleware_1.loginRateLimiter, (0, validate_middleware_1.validate)(auth_validator_1.loginSchema), authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/verify-2fa", rateLimiter_middleware_1.twoFactorRateLimiter, authController.verifyTwoFactor);
router.post("/auth/request-login-code", rateLimiter_middleware_1.loginRateLimiter, (0, validate_middleware_1.validate)(auth_validator_1.requestLoginCodeSchema), authController.requestLoginCode);
router.post("/auth/verify-login-code", rateLimiter_middleware_1.loginRateLimiter, (0, validate_middleware_1.validate)(auth_validator_1.verifyLoginCodeSchema), authController.verifyLoginCode);
router.post("/auth/forgot-password", rateLimiter_middleware_1.loginRateLimiter, (0, validate_middleware_1.validate)(auth_validator_1.forgotPasswordSchema), authController.forgotPassword);
router.post("/auth/reset-password", (0, validate_middleware_1.validate)(auth_validator_1.resetPasswordSchema), authController.resetPassword);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", auth_middleware_1.requireAuth, authController.me);
exports.default = router;
