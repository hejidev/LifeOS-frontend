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
const roles_middleware_1 = require("../middlewares/roles.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const rateLimiter_middleware_1 = require("../middlewares/rateLimiter.middleware");
const contact_submission_validator_1 = require("../validators/contact-submission.validator");
const contactSubmissionController = __importStar(require("../controllers/contact-submission.controller"));
const router = (0, express_1.Router)();
router.post("/", rateLimiter_middleware_1.loginRateLimiter, (0, validate_middleware_1.validate)(contact_submission_validator_1.createContactSubmissionSchema), contactSubmissionController.create);
router.use(auth_middleware_1.requireAuth);
router.use((0, roles_middleware_1.requireRole)("ADMIN", "SUPER_ADMIN"));
router.get("/", contactSubmissionController.list);
router.patch("/:id/status", (0, validate_middleware_1.validate)(contact_submission_validator_1.updateSubmissionStatusSchema), contactSubmissionController.updateStatus);
exports.default = router;
