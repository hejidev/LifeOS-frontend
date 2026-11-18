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
const usage_middleware_1 = require("../middlewares/usage.middleware");
const rate_limit_1 = require("../lib/rate-limit");
const upload_1 = require("../lib/upload");
const converter_validator_1 = require("../validators/converter.validator");
const converter_service_1 = require("../services/converter.service");
const converterController = __importStar(require("../controllers/converter.controller"));
const MAX_BYTES = 25 * 1024 * 1024;
const pdfUpload = (0, upload_1.singleUpload)("file", { maxBytes: MAX_BYTES, allow: (file) => /\.pdf$/i.test(file.originalname), rejectMessage: "Upload a PDF file." });
const docxUpload = (0, upload_1.singleUpload)("file", { maxBytes: MAX_BYTES, allow: (file) => /\.docx$/i.test(file.originalname), rejectMessage: "Upload a DOCX file." });
const anyUpload = (0, upload_1.singleUpload)("file", { maxBytes: MAX_BYTES, allow: (file) => (0, converter_service_1.isSupportedInput)(file.originalname), rejectMessage: "That file type isn't supported for conversion." });
const extractLimit = (0, rate_limit_1.rateLimitUser)("converter-extract", 20, 60, "You're converting too quickly.");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.post("/converter/text", (0, validate_middleware_1.validate)(converter_validator_1.textConvertSchema), extractLimit, converterController.convertText);
router.post("/converter/pdf-text", extractLimit, pdfUpload, converterController.extractPdfText);
router.post("/converter/docx-text", extractLimit, docxUpload, converterController.extractDocxText);
router.post("/converter/file", (0, rate_limit_1.rateLimitUser)("converter-file", 5, 60, "You're converting too quickly."), anyUpload, (0, validate_middleware_1.validate)(converter_validator_1.fileConvertSchema), (0, rate_limit_1.rateLimitUser)("converter-file-day", 40, 86400, "You've reached today's conversion limit."), (0, usage_middleware_1.requireUsageOrSubscription)("FILE_CONVERTER"), converterController.convertFile);
exports.default = router;
