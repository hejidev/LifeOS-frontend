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
const permission_middleware_1 = require("../middlewares/permission.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const cms_validator_1 = require("../validators/cms.validator");
const cmsController = __importStar(require("../controllers/cms.controller"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = (0, express_1.Router)();
router.get("/public/blog/:slug", cmsController.getPublishedBySlug);
router.get("/public/:type", cmsController.getPublished);
router.use(auth_middleware_1.requireAuth);
router.get("/mine", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), cmsController.listMine);
router.get("/all", (0, roles_middleware_1.requireRole)("SUPER_ADMIN"), cmsController.listAll);
router.post("/upload-image", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), upload.single("file"), cmsController.uploadImage);
router.post("/", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), (0, validate_middleware_1.validate)(cms_validator_1.createContentSchema), cmsController.create);
router.patch("/:id", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), (0, validate_middleware_1.validate)(cms_validator_1.updateContentSchema), cmsController.update);
router.post("/:id/submit-review", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), cmsController.submitForReview);
router.post("/:id/publish", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), cmsController.publishDirectly);
router.post("/:id/review", (0, roles_middleware_1.requireRole)("SUPER_ADMIN"), (0, validate_middleware_1.validate)(cms_validator_1.reviewContentSchema), cmsController.review);
router.delete("/:id", (0, permission_middleware_1.requirePermission)("MANAGE_CONTENT"), cmsController.remove);
exports.default = router;
