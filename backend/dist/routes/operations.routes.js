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
const errors_1 = require("../lib/errors");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const merchant_middleware_1 = require("../middlewares/merchant.middleware");
const staff_session_middleware_1 = require("../middlewares/staff-session.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const ops = __importStar(require("../controllers/operations.controller"));
const operations_validator_1 = require("../validators/operations.validator");
const router = (0, express_1.Router)();
const owner = [auth_middleware_1.requireAuth, merchant_middleware_1.requireMerchant];
function stockRole(req, _res, next) {
    if (req.staff && ["INVENTORY_CLERK", "MANAGER"].includes(req.staff.role))
        return next();
    next(new errors_1.AppError("Your role can't change stock levels.", 403));
}
router.post("/ops/products/:id/stock", ...owner, (0, validate_middleware_1.validate)(operations_validator_1.adjustStockSchema), ops.ownerAdjustStock);
router.get("/ops/products/:id/stock-history", ...owner, ops.ownerStockHistory);
router.get("/ops/reports/daily", ...owner, ops.dailyReport);
router.get("/ops/attention", ...owner, ops.attention);
router.post("/staff-ops/products/:id/stock", staff_session_middleware_1.requireStaffSession, stockRole, (0, validate_middleware_1.validate)(operations_validator_1.adjustStockSchema), ops.staffAdjustStock);
router.get("/staff-ops/products/:id/stock-history", staff_session_middleware_1.requireStaffSession, ops.staffStockHistory);
router.get("/staff-ops/shift-summary", staff_session_middleware_1.requireStaffSession, ops.shiftSummary);
exports.default = router;
