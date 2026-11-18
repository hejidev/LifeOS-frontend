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
const documents_validator_1 = require("../validators/documents.validator");
const documentsController = __importStar(require("../controllers/documents.controller"));
const ALLOWED = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
];
const documentUpload = (0, upload_1.singleUpload)("file", {
    maxBytes: 20 * 1024 * 1024,
    allow: (file) => ALLOWED.includes(file.mimetype),
    rejectMessage: "Use an image, PDF, Word, Excel or text file.",
});
const router = (0, express_1.Router)();
router.get("/documents/dashboard", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(documents_validator_1.documentsDashboardQuerySchema), documentsController.getDashboard);
router.get("/documents/:id/file", auth_middleware_1.requireAuth, documentsController.getFile);
router.post("/documents/folders", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(documents_validator_1.createFolderSchema), documentsController.createFolder);
router.patch("/documents/folders/:id", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(documents_validator_1.updateFolderSchema), documentsController.updateFolder);
router.delete("/documents/folders/:id", auth_middleware_1.requireAuth, documentsController.deleteFolder);
router.post("/documents/upload", auth_middleware_1.requireAuth, (0, rate_limit_1.rateLimitUser)("doc-upload", 30, 3600, "You've uploaded a lot of files."), documentUpload, documentsController.uploadDocumentFile);
router.post("/documents", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(documents_validator_1.createDocumentSchema), documentsController.createDocument);
router.patch("/documents/:id", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(documents_validator_1.updateDocumentSchema), documentsController.updateDocument);
router.delete("/documents/:id", auth_middleware_1.requireAuth, documentsController.deleteDocument);
exports.default = router;
