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
exports.deleteCategory = exports.deleteAccount = exports.updateAccount = exports.createTransfer = void 0;
const errors_1 = require("../lib/errors");
const finance = __importStar(require("../services/finance.service"));
exports.createTransfer = (0, errors_1.asyncHandler)(async (req, res) => res.status(201).json({ transfer: await finance.createTransfer(req.user.id, req.body) }));
exports.updateAccount = (0, errors_1.asyncHandler)(async (req, res) => res.json({ account: await finance.updateAccount(req.user.id, req.params.id, req.body) }));
exports.deleteAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    await finance.deleteAccount(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.deleteCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    await finance.deleteCategory(req.user.id, req.params.id);
    return res.status(204).send();
});
