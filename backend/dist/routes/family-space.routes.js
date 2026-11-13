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
const controller = __importStar(require("../controllers/family-space.controller"));
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get("/me", controller.me);
router.post("/setup", (0, validate_middleware_1.validate)(controller.setupSchema), controller.setup);
router.get("/members", controller.members);
router.post("/children", (0, validate_middleware_1.validate)(controller.createChildSchema), controller.createChild);
router.patch("/children/:memberId/password", (0, validate_middleware_1.validate)(controller.passwordSchema), controller.resetPassword);
router.delete("/children/:memberId", controller.deleteChild);
router.put("/children/:memberId/schedules", (0, validate_middleware_1.validate)(controller.schedulesSchema), controller.saveSchedules);
router.post("/children/:memberId/override", (0, validate_middleware_1.validate)(controller.overrideSchema), controller.setOverride);
router.delete("/children/:memberId/override", controller.clearOverride);
router.get("/threads", controller.threads);
router.get("/threads/:key/messages", controller.messages);
router.post("/threads/:key/messages", (0, validate_middleware_1.validate)(controller.messageSchema), controller.send);
router.post("/threads/:key/read", controller.read);
exports.default = router;
