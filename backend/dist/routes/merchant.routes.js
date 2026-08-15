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
const merchant_middleware_1 = require("../middlewares/merchant.middleware");
const permission_middleware_1 = require("../middlewares/permission.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const merchant_validator_1 = require("../validators/merchant.validator");
const merchantController = __importStar(require("../controllers/merchant.controller"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
        if (!allowed.includes(file.mimetype))
            return cb(new Error("Only images or PDF are allowed for ID documents"));
        cb(null, true);
    },
});
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get("/status", merchantController.getStatus);
router.post("/apply", (0, validate_middleware_1.validate)(merchant_validator_1.applyMerchantSchema), merchantController.apply);
router.post("/id-upload", upload.single("file"), merchantController.uploadIdDocument);
router.post("/checkout", (0, validate_middleware_1.validate)(merchant_validator_1.merchantCheckoutSchema), merchantController.checkout);
router.post("/billing-portal", merchantController.portal);
router.get("/applications", (0, permission_middleware_1.requirePermission)("MANAGE_MERCHANTS"), merchantController.listApplications);
router.get("/applications/:id", (0, permission_middleware_1.requirePermission)("MANAGE_MERCHANTS"), merchantController.getApplicationDetail);
router.patch("/applications/:id", (0, permission_middleware_1.requirePermission)("MANAGE_MERCHANTS"), (0, validate_middleware_1.validate)(merchant_validator_1.reviewApplicationSchema), merchantController.reviewApplication);
router.patch("/applications/:id/verify-id", (0, permission_middleware_1.requirePermission)("MANAGE_MERCHANTS"), merchantController.verifyId);
router.get("/staff-login-code", merchant_middleware_1.requireMerchant, merchantController.getStaffLoginCode);
router.post("/staff-login-code/regenerate", merchant_middleware_1.requireMerchant, merchantController.regenerateStoreCode);
router.post("/staff/force-logout", merchant_middleware_1.requireMerchant, merchantController.forceStaffLogout);
router.patch("/notifications", merchant_middleware_1.requireMerchant, (0, validate_middleware_1.validate)(merchant_validator_1.notificationSettingsSchema), merchantController.updateNotificationSettings);
router.patch("/pause", merchant_middleware_1.requireMerchant, (0, validate_middleware_1.validate)(merchant_validator_1.pauseStoreSchema), merchantController.setPaused);
exports.default = router;
