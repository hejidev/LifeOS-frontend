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
const tools = __importStar(require("../controllers/platform-tools.controller"));
const platform_tools_validator_1 = require("../validators/platform-tools.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.use((0, roles_middleware_1.requireRole)("SUPER_ADMIN"));
router.get("/traffic", tools.getTraffic);
router.get("/instances", tools.getInstances);
router.post("/balance-probe", tools.probe);
router.get("/fixtures", tools.fixtures);
router.post("/fixtures/seed", tools.seed);
router.delete("/fixtures", tools.removeFixtures);
router.get("/load-tests", tools.listRuns);
router.post("/load-tests", (0, validate_middleware_1.validate)(platform_tools_validator_1.startLoadTestSchema), tools.startRun);
router.get("/load-tests/:id", tools.getRun);
router.post("/load-tests/:id/stop", tools.stopRun);
router.get("/support/queues", tools.queues);
router.get("/support/search", tools.search);
router.get("/support/accounts/:id", tools.account);
router.post("/support/accounts/:id/notes", (0, validate_middleware_1.validate)(platform_tools_validator_1.noteSchema), tools.addNote);
router.delete("/support/notes/:noteId", tools.deleteNote);
router.post("/support/accounts/:id/merchant-action", (0, validate_middleware_1.validate)(platform_tools_validator_1.merchantActionSchema), tools.merchantAction);
exports.default = router;
