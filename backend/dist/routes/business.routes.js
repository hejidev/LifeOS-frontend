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
const businessController = __importStar(require("../controllers/business.controller"));
const business_validator_1 = require("../validators/business.validator");
const merchant_middleware_1 = require("../middlewares/merchant.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.use(merchant_middleware_1.requireMerchant);
router.get("/dashboard", businessController.getDashboard);
router.get("/profile", businessController.getProfile);
router.patch("/profile", (0, validate_middleware_1.validate)(business_validator_1.updateBizProfileSchema), businessController.updateProfile);
router.get("/products", businessController.getProducts);
router.post("/products", (0, validate_middleware_1.validate)(business_validator_1.createProductSchema), businessController.createProduct);
router.patch("/products/:id", (0, validate_middleware_1.validate)(business_validator_1.updateProductSchema), businessController.updateProduct);
router.delete("/products/:id", businessController.deleteProduct);
router.get("/customers", businessController.getCustomers);
router.post("/customers", (0, validate_middleware_1.validate)(business_validator_1.createCustomerSchema), businessController.createCustomer);
router.get("/sales", businessController.getSales);
router.post("/sales", (0, validate_middleware_1.validate)(business_validator_1.createSaleSchema), businessController.createSale);
router.patch("/sales/:id/status", (0, validate_middleware_1.validate)(business_validator_1.updateSaleStatusSchema), businessController.updateSaleStatus);
router.get("/expenses", businessController.getExpenses);
router.post("/expenses", (0, validate_middleware_1.validate)(business_validator_1.createExpenseSchema), businessController.createExpense);
router.delete("/expenses/:id", businessController.deleteExpense);
router.get("/products/paged", businessController.getProductsPaged);
exports.default = router;
