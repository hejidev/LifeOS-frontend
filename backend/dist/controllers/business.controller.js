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
exports.getProductsPaged = exports.deleteExpense = exports.createExpense = exports.getExpenses = exports.updateSaleStatus = exports.createSale = exports.getSales = exports.createCustomer = exports.getCustomers = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = exports.updateProfile = exports.getProfile = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const businessService = __importStar(require("../services/business.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const range = req.query.range ?? "today";
    const dashboard = await businessService.getDashboard(req.user.id, range);
    return res.json(dashboard);
});
exports.getProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await businessService.getOrCreateProfile(req.user.id);
    return res.json({ profile });
});
exports.updateProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await businessService.updateProfile(req.user.id, req.body);
    return res.json({ profile });
});
exports.getProducts = (0, errors_1.asyncHandler)(async (req, res) => {
    const products = await businessService.listProducts(req.user.id, req.query.active === "true");
    return res.json({ products });
});
exports.createProduct = (0, errors_1.asyncHandler)(async (req, res) => {
    const product = await businessService.createProduct(req.user.id, req.body);
    return res.status(201).json({ product });
});
exports.updateProduct = (0, errors_1.asyncHandler)(async (req, res) => {
    const product = await businessService.updateProduct(req.user.id, req.params.id, req.body);
    return res.json({ product });
});
exports.deleteProduct = (0, errors_1.asyncHandler)(async (req, res) => {
    await businessService.deleteProduct(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.getCustomers = (0, errors_1.asyncHandler)(async (req, res) => {
    const customers = await businessService.listCustomers(req.user.id);
    return res.json({ customers });
});
exports.createCustomer = (0, errors_1.asyncHandler)(async (req, res) => {
    const customer = await businessService.createCustomer(req.user.id, req.body);
    return res.status(201).json({ customer });
});
exports.getSales = (0, errors_1.asyncHandler)(async (req, res) => {
    const range = req.query.range ?? "month";
    const sales = await businessService.listSales(req.user.id, range);
    return res.json({ sales });
});
exports.createSale = (0, errors_1.asyncHandler)(async (req, res) => {
    const sale = await businessService.createSale(req.user.id, req.body);
    return res.status(201).json({ sale });
});
exports.updateSaleStatus = (0, errors_1.asyncHandler)(async (req, res) => {
    const sale = await businessService.updateSaleStatus(req.user.id, req.params.id, req.body.status);
    return res.json({ sale });
});
exports.getExpenses = (0, errors_1.asyncHandler)(async (req, res) => {
    const range = req.query.range ?? "month";
    const expenses = await businessService.listExpenses(req.user.id, range);
    return res.json({ expenses });
});
exports.createExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await businessService.createExpense(req.user.id, req.body);
    return res.status(201).json({ expense });
});
exports.deleteExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    await businessService.deleteExpense(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.getProductsPaged = (0, errors_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = req.query.search;
    const activeOnly = req.query.active === "true";
    const result = await businessService.listProductsPaged(req.user.id, { page, pageSize, search, activeOnly });
    return res.json(result);
});
