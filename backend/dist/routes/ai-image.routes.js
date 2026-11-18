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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const usage_middleware_1 = require("../middlewares/usage.middleware");
const rate_limit_1 = require("../lib/rate-limit");
const ai_image_validator_1 = require("../validators/ai-image.validator");
const aiImageController = __importStar(require("../controllers/ai-image.controller"));
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => (ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("Use a PNG, JPG, WebP, GIF or AVIF image"))),
});
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
const guard = (0, rate_limit_1.rateLimitUser)("image-tools", 20, 60, "You're editing too quickly.");
router.post("/image-tools/upload", (0, rate_limit_1.rateLimitUser)("image-upload", 30, 3600, "You've uploaded a lot of images."), upload.single("file"), aiImageController.uploadImage);
router.post("/image-tools/apply", (0, validate_middleware_1.validate)(ai_image_validator_1.applyToolSchema), guard, (0, usage_middleware_1.requireUsageOrSubscription)("AI_IMAGE"), aiImageController.applyTool);
router.post("/image-tools/convert", (0, validate_middleware_1.validate)(ai_image_validator_1.convertFormatSchema), guard, (0, usage_middleware_1.requireUsageOrSubscription)("AI_IMAGE"), aiImageController.convertFormat);
router.post("/image-tools/generative", (0, validate_middleware_1.validate)(ai_image_validator_1.generativeEditSchema), guard, (0, usage_middleware_1.requireUsageOrSubscription)("AI_IMAGE"), aiImageController.generativeEdit);
exports.default = router;
