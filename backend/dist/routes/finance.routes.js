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
const finance_validator_1 = require("../validators/finance.validator");
const financeController = __importStar(require("../controllers/finance.controller"));
const router = (0, express_1.Router)();
router.get("/finance/dashboard", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.dashboardQuerySchema), financeController.getDashboard);
router.get("/finance/accounts", auth_middleware_1.requireAuth, financeController.getAccounts);
router.post("/finance/accounts", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.createAccountSchema), financeController.createAccount);
router.patch("/finance/accounts/:id", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.updateAccountSchema), financeController.updateAccount);
router.get("/finance/categories", auth_middleware_1.requireAuth, financeController.getCategories);
router.post("/finance/categories", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.createCategorySchema), financeController.createCategory);
router.post("/finance/budgets", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.createBudgetSchema), financeController.createBudget);
router.get("/finance/transactions", auth_middleware_1.requireAuth, financeController.getDashboard); // reuse dashboard list
router.post("/finance/transactions", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.createTransactionSchema), financeController.createTransaction);
router.patch("/finance/transactions/:id", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(finance_validator_1.updateTransactionSchema), financeController.updateTransaction);
router.delete("/finance/transactions/:id", auth_middleware_1.requireAuth, financeController.deleteTransaction);
exports.default = router;
