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
const upload_1 = require("../lib/upload");
const study_validator_1 = require("../validators/study.validator");
const studyController = __importStar(require("../controllers/study.controller"));
const ALLOWED = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
];
const materialUpload = (0, upload_1.singleUpload)("file", {
    maxBytes: 20 * 1024 * 1024,
    allow: (file) => ALLOWED.includes(file.mimetype),
    rejectMessage: "Use an image, PDF, Word, PowerPoint or text file.",
});
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get("/study/dashboard", (0, validate_middleware_1.validate)(study_validator_1.dashboardStudyQuerySchema), studyController.getDashboard);
router.get("/study/subjects", studyController.getSubjects);
router.post("/study/subjects", (0, validate_middleware_1.validate)(study_validator_1.createSubjectSchema), studyController.createSubject);
router.patch("/study/subjects/:id", (0, validate_middleware_1.validate)(study_validator_1.updateSubjectSchema), studyController.updateSubject);
router.get("/study/materials", studyController.getMaterials);
router.get("/study/materials/:id/file", studyController.getMaterialFile);
router.post("/study/materials", (0, validate_middleware_1.validate)(study_validator_1.createStudyMaterialSchema), studyController.createMaterial);
router.patch("/study/materials/:id", (0, validate_middleware_1.validate)(study_validator_1.updateStudyMaterialSchema), studyController.updateMaterial);
router.post("/study/materials/upload", (0, rate_limit_1.rateLimitUser)("study-upload", 30, 3600, "You've uploaded a lot of files."), materialUpload, studyController.uploadMaterialFile);
router.delete("/study/materials/:id", studyController.deleteMaterial);
router.post("/study/sessions", (0, validate_middleware_1.validate)(study_validator_1.createStudySessionSchema), studyController.createSession);
router.patch("/study/sessions/:id/end", (0, validate_middleware_1.validate)(study_validator_1.endStudySessionSchema), studyController.endSession);
router.delete("/study/subjects/:id", studyController.deleteSubject);
exports.default = router;
