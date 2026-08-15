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
exports.uploadDocumentFile = exports.deleteDocument = exports.updateDocument = exports.createDocument = exports.deleteFolder = exports.updateFolder = exports.createFolder = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const documentsService = __importStar(require("../services/documents.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const { q, category } = req.validated.query ?? {};
    const data = await documentsService.getDocumentsDashboard(req.user.id, { q, category });
    return res.json(data);
});
exports.createFolder = (0, errors_1.asyncHandler)(async (req, res) => {
    const folder = await documentsService.createFolder(req.user.id, req.validated.body);
    return res.status(201).json({ folder });
});
exports.updateFolder = (0, errors_1.asyncHandler)(async (req, res) => {
    const folder = await documentsService.updateFolder(req.user.id, req.params.id, req.validated.body);
    return res.json({ folder });
});
exports.deleteFolder = (0, errors_1.asyncHandler)(async (req, res) => {
    await documentsService.deleteFolder(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.createDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    const doc = await documentsService.createDocument(req.user.id, req.validated.body);
    return res.status(201).json({ document: doc });
});
exports.updateDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    const doc = await documentsService.updateDocument(req.user.id, req.params.id, req.validated.body);
    return res.json({ document: doc });
});
exports.deleteDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    await documentsService.deleteDocument(req.user.id, req.params.id);
    return res.status(204).send();
});
exports.uploadDocumentFile = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const result = await documentsService.uploadDocumentFile(file.buffer, file.originalname, file.mimetype);
    return res.status(201).json(result);
});
