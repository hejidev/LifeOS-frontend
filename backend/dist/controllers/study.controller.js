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
exports.deleteMaterial = exports.endSession = exports.createSession = exports.uploadMaterialFile = exports.updateMaterial = exports.createMaterial = exports.getMaterials = exports.updateSubject = exports.createSubject = exports.getSubjects = exports.getDashboard = void 0;
const errors_1 = require("../lib/errors");
const studyService = __importStar(require("../services/study.service"));
exports.getDashboard = (0, errors_1.asyncHandler)(async (req, res) => {
    const { range } = req.validated.query ?? {};
    const data = await studyService.getStudyDashboard(req.user.id, range ?? "month");
    return res.json(data);
});
exports.getSubjects = (0, errors_1.asyncHandler)(async (req, res) => {
    const subjects = await studyService.getSubjects(req.user.id);
    return res.json({ subjects });
});
exports.createSubject = (0, errors_1.asyncHandler)(async (req, res) => {
    const subject = await studyService.createSubject(req.user.id, req.validated.body);
    return res.status(201).json({ subject });
});
exports.updateSubject = (0, errors_1.asyncHandler)(async (req, res) => {
    const subject = await studyService.updateSubject(req.user.id, req.params.id, req.validated.body);
    return res.json({ subject });
});
exports.getMaterials = (0, errors_1.asyncHandler)(async (req, res) => {
    const materials = await studyService.getMaterials(req.user.id);
    return res.json({ materials });
});
exports.createMaterial = (0, errors_1.asyncHandler)(async (req, res) => {
    const material = await studyService.createMaterial(req.user.id, req.validated.body);
    return res.status(201).json({ material });
});
exports.updateMaterial = (0, errors_1.asyncHandler)(async (req, res) => {
    const material = await studyService.updateMaterial(req.user.id, req.params.id, req.validated.body);
    return res.json({ material });
});
exports.uploadMaterialFile = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const result = await studyService.uploadMaterialFile(file.buffer, file.originalname, file.mimetype);
    return res.status(201).json(result);
});
exports.createSession = (0, errors_1.asyncHandler)(async (req, res) => {
    const session = await studyService.createSession(req.user.id, req.validated.body);
    return res.status(201).json({ session });
});
exports.endSession = (0, errors_1.asyncHandler)(async (req, res) => {
    const session = await studyService.endSession(req.user.id, req.params.id, req.validated.body);
    return res.json({ session });
});
exports.deleteMaterial = (0, errors_1.asyncHandler)(async (req, res) => {
    await studyService.deleteMaterial(req.user.id, req.params.id);
    return res.status(204).send();
});
