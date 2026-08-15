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
exports.uploadImage = exports.getPublishedBySlug = exports.getPublished = exports.listMine = exports.listAll = exports.remove = exports.review = exports.publishDirectly = exports.submitForReview = exports.update = exports.create = void 0;
const errors_1 = require("../lib/errors");
const cmsService = __importStar(require("../services/cms.service"));
const cloudinary_1 = require("../config/cloudinary");
exports.create = (0, errors_1.asyncHandler)(async (req, res) => {
    const item = await cmsService.createContent(req.user.id, req.body);
    return res.status(201).json({ item });
});
exports.update = (0, errors_1.asyncHandler)(async (req, res) => {
    const item = await cmsService.updateContent(req.params.id, req.body);
    return res.json({ item });
});
exports.submitForReview = (0, errors_1.asyncHandler)(async (req, res) => {
    const item = await cmsService.submitForReview(req.user.id, req.params.id);
    return res.json({ item });
});
exports.publishDirectly = (0, errors_1.asyncHandler)(async (req, res) => {
    const item = await cmsService.publishDirectly(req.params.id);
    return res.json({ item });
});
exports.review = (0, errors_1.asyncHandler)(async (req, res) => {
    const { action, note } = req.body;
    const item = await cmsService.reviewContent(req.user.id, req.params.id, action, note);
    return res.json({ item });
});
exports.remove = (0, errors_1.asyncHandler)(async (req, res) => {
    await cmsService.deleteContent(req.params.id);
    return res.status(204).send();
});
exports.listAll = (0, errors_1.asyncHandler)(async (req, res) => {
    const items = await cmsService.listAllContent(req.query.type, req.query.status);
    return res.json({ items });
});
exports.listMine = (0, errors_1.asyncHandler)(async (req, res) => {
    const items = await cmsService.listMyContent(req.user.id);
    return res.json({ items });
});
exports.getPublished = (0, errors_1.asyncHandler)(async (req, res) => {
    const items = await cmsService.getPublished(req.params.type);
    return res.json({ items });
});
exports.getPublishedBySlug = (0, errors_1.asyncHandler)(async (req, res) => {
    const item = await cmsService.getPublishedBySlug(req.params.slug);
    return res.json({ item });
});
exports.uploadImage = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: "lifeos/cms", resource_type: "image" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(file.buffer);
    });
    return res.status(201).json({ url: uploaded.secure_url });
});
