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
exports.generativeEdit = exports.convertFormat = exports.applyTool = exports.uploadImage = void 0;
const errors_1 = require("../lib/errors");
const aiImageService = __importStar(require("../services/ai-image.service"));
exports.uploadImage = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const result = await aiImageService.uploadForProcessing(file.buffer, file.originalname);
    return res.status(201).json(result);
});
exports.applyTool = (0, errors_1.asyncHandler)(async (req, res) => {
    const { publicId, tool, format } = req.body;
    const url = aiImageService.buildTransformedUrl(publicId, tool, format);
    return res.json({ url });
});
exports.convertFormat = (0, errors_1.asyncHandler)(async (req, res) => {
    const { publicId, format, quality } = req.body;
    const url = aiImageService.buildFormatConvertedUrl(publicId, format, quality);
    return res.json({ url });
});
exports.generativeEdit = (0, errors_1.asyncHandler)(async (req, res) => {
    const { publicId, prompt, mode } = req.body;
    const url = aiImageService.buildGenerativeEditUrl(publicId, prompt, mode);
    return res.json({ url });
});
