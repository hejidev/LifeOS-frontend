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
exports.createSale = exports.createCustomer = exports.getCustomers = exports.getProducts = void 0;
const errors_1 = require("../lib/errors");
const staffPosService = __importStar(require("../services/staff-pos.service"));
exports.getProducts = (0, errors_1.asyncHandler)(async (req, res) => {
    const products = await staffPosService.getProducts(req.staff.bizProfileId);
    return res.json({ products });
});
exports.getCustomers = (0, errors_1.asyncHandler)(async (req, res) => {
    const customers = await staffPosService.getCustomers(req.staff.bizProfileId);
    return res.json({ customers });
});
exports.createCustomer = (0, errors_1.asyncHandler)(async (req, res) => {
    const customer = await staffPosService.createCustomer(req.staff.bizProfileId, req.body);
    return res.status(201).json({ customer });
});
exports.createSale = (0, errors_1.asyncHandler)(async (req, res) => {
    const sale = await staffPosService.createSale(req.staff.staffId, req.staff.bizProfileId, req.body);
    return res.status(201).json({ sale });
});
