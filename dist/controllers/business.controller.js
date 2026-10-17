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
exports.exportSales = exports.exportProducts = exports.bulkImportProducts = exports.uploadProductImage = exports.getProductByBarcode = exports.deleteExpense = exports.getExpenses = exports.createExpense = exports.updateSaleStatus = exports.getSales = exports.createSale = exports.exportCustomers = exports.updateCustomer = exports.createCustomer = exports.getCustomers = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = exports.updateProfile = exports.getProfile = exports.getProductsPaged = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const businessService = __importStar(require("../services/business.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const { range, from, to, storeId } = req.query;
    const dashboard = await businessService.getDashboard(req.user.id, { range, from, to }, storeId);
    return res.json(dashboard);
});
exports.getProductsPaged = (0, errors_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = req.query.search;
    const activeOnly = req.query.active === "true";
    const storeId = req.query.storeId;
    const result = await businessService.listProductsPaged(req.user.id, { page, pageSize, search, activeOnly, storeId });
    return res.json(result);
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
    const products = await businessService.listProducts(req.user.id, req.query.active === "true", req.query.storeId);
    return res.json({ products });
});
exports.createProduct = (0, errors_1.asyncHandler)(async (req, res) => {
    const { storeId, ...body } = req.body;
    const product = await businessService.createProduct(req.user.id, body, storeId);
    return res.status(201).json({ product });
});
exports.updateProduct = (0, errors_1.asyncHandler)(async (req, res) => {
    const { storeId, ...body } = req.body;
    const product = await businessService.updateProduct(req.user.id, req.params.id, body, storeId);
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
exports.updateCustomer = (0, errors_1.asyncHandler)(async (req, res) => {
    const customer = await businessService.updateCustomer(req.user.id, req.params.id, req.body);
    return res.json({ customer });
});
exports.exportCustomers = (0, errors_1.asyncHandler)(async (req, res) => {
    const csv = await businessService.exportCustomersCSV(req.user.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="customers-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
});
exports.createSale = (0, errors_1.asyncHandler)(async (req, res) => {
    const { storeId, ...body } = req.body;
    const sale = await businessService.createSale(req.user.id, body, storeId);
    return res.status(201).json({ sale });
});
exports.getSales = (0, errors_1.asyncHandler)(async (req, res) => {
    const range = req.query.range ?? "month";
    const sales = await businessService.listSales(req.user.id, range, req.query.storeId);
    return res.json({ sales });
});
exports.updateSaleStatus = (0, errors_1.asyncHandler)(async (req, res) => {
    const sale = await businessService.updateSaleStatus(req.user.id, req.params.id, req.body.status);
    return res.json({ sale });
});
exports.createExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const { storeId, ...body } = req.body;
    const expense = await businessService.createExpense(req.user.id, body, storeId);
    return res.status(201).json({ expense });
});
exports.getExpenses = (0, errors_1.asyncHandler)(async (req, res) => {
    const range = req.query.range ?? "month";
    const expenses = await businessService.listExpenses(req.user.id, range, req.query.storeId);
    return res.json({ expenses });
});
exports.deleteExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    await businessService.deleteExpense(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.getProductByBarcode = (0, errors_1.asyncHandler)(async (req, res) => {
    const product = await businessService.getProductByBarcode(req.user.id, req.params.barcode, req.query.storeId);
    return res.json({ product });
});
exports.uploadProductImage = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const result = await businessService.uploadProductImage(file.buffer, file.originalname);
    return res.status(201).json(result);
});
exports.bulkImportProducts = (0, errors_1.asyncHandler)(async (req, res) => {
    const { products, storeId } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        throw new errors_1.AppError("Invalid products data - expected non-empty array", 400);
    }
    const results = await businessService.bulkImportProducts(req.user.id, products, storeId);
    return res.status(201).json(results);
});
exports.exportProducts = (0, errors_1.asyncHandler)(async (req, res) => {
    const csv = await businessService.exportProductsCSV(req.user.id, {
        storeId: req.query.storeId,
        activeOnly: req.query.active === "true",
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
});
exports.exportSales = (0, errors_1.asyncHandler)(async (req, res) => {
    const csv = await businessService.exportSalesCSV(req.user.id, {
        range: req.query.range,
        storeId: req.query.storeId,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sales-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
});
