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
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.createBudget = exports.createCategory = exports.getCategories = exports.updateAccount = exports.createAccount = exports.getAccounts = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const financeService = __importStar(require("../services/finance.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const { month, year } = req.validated.query ?? {};
    const data = await financeService.getFinanceDashboard(req.user.id, month, year);
    return res.json(data);
});
exports.getAccounts = (0, errors_1.asyncHandler)(async (req, res) => {
    const accounts = await financeService.getAccounts(req.user.id);
    return res.json({ accounts });
});
exports.createAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await financeService.createAccount(req.user.id, req.validated.body);
    return res.status(201).json({ account });
});
exports.updateAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await financeService.updateAccount(req.user.id, req.params.id, req.validated.body);
    return res.json({ account });
});
exports.getCategories = (0, errors_1.asyncHandler)(async (req, res) => {
    const categories = await financeService.getCategories(req.user.id);
    return res.json({ categories });
});
exports.createCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    const category = await financeService.createCategory(req.user.id, req.validated.body);
    return res.status(201).json({ category });
});
exports.createBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await financeService.createBudget(req.user.id, req.validated.body);
    return res.status(201).json({ budget });
});
exports.createTransaction = (0, errors_1.asyncHandler)(async (req, res) => {
    const tx = await financeService.createTransaction(req.user.id, req.validated.body);
    return res.status(201).json({ transaction: tx });
});
exports.updateTransaction = (0, errors_1.asyncHandler)(async (req, res) => {
    const tx = await financeService.updateTransaction(req.user.id, req.params.id, req.validated.body);
    return res.json({ transaction: tx });
});
exports.deleteTransaction = (0, errors_1.asyncHandler)(async (req, res) => {
    await financeService.deleteTransaction(req.user.id, req.params.id);
    return res.status(204).send();
});
