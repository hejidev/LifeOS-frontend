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
const ai_writing_validator_1 = require("../validators/ai-writing.validator");
const aiWritingController = __importStar(require("../controllers/ai-writing.controller"));
const usage_middleware_1 = require("../middlewares/usage.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.post("/ai/writing/stream", (0, usage_middleware_1.requireUsageOrSubscription)("AI_WRITING"), (0, validate_middleware_1.validate)(ai_writing_validator_1.streamWritingSchema), aiWritingController.streamWritingHandler);
router.post("/ai/writing/documents", (0, validate_middleware_1.validate)(ai_writing_validator_1.saveDocumentSchema), aiWritingController.saveDocument);
router.get("/ai/writing/documents", aiWritingController.getDocuments);
router.delete("/ai/writing/documents/:id", aiWritingController.deleteDocument);
router.post("/ai/writing/documents/:id/convert-to-note", aiWritingController.convertToNote);
exports.default = router;
