"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertOwnImage = assertOwnImage;
exports.uploadForProcessing = uploadForProcessing;
exports.buildTransformedUrl = buildTransformedUrl;
exports.buildFormatConvertedUrl = buildFormatConvertedUrl;
exports.buildGenerativeEditUrl = buildGenerativeEditUrl;
exports.cleanupExpiredImageTools = cleanupExpiredImageTools;
const cloudinary_1 = require("../config/cloudinary");
const errors_1 = require("../lib/errors");
const ROOT = "lifeos/image-tools";
const folderOf = (userId) => `${ROOT}/${userId}`;
function assertOwnImage(userId, publicId) {
    if (!publicId.startsWith(`${folderOf(userId)}/`) || publicId.includes(".."))
        throw new errors_1.AppError("Image not found", 404);
}
async function uploadForProcessing(userId, buffer) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: folderOf(userId), resource_type: "image" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return { publicId: uploaded.public_id, url: uploaded.secure_url, width: uploaded.width, height: uploaded.height };
}
const PRESETS = {
    REMOVE_BACKGROUND: "e_background_removal",
    UPSCALE: "e_upscale",
    ENHANCE: "e_improve,e_auto_contrast,e_auto_brightness",
    GRAYSCALE: "e_grayscale",
    SEPIA: "e_sepia",
};
function buildTransformedUrl(publicId, tool, format) {
    const transformation = PRESETS[tool];
    if (!transformation)
        throw new errors_1.AppError("Unknown image tool", 400);
    return cloudinary_1.cloudinary.url(publicId, { transformation: [{ raw_transformation: transformation }], ...(format && { format }), secure: true });
}
function buildFormatConvertedUrl(publicId, format, quality) {
    return cloudinary_1.cloudinary.url(publicId, { format, quality: quality ?? "auto", secure: true });
}
function buildGenerativeEditUrl(publicId, prompt, mode) {
    const text = encodeURIComponent(prompt.replace(/[\r\n]+/g, " ").trim());
    const effect = mode === "remove" ? `e_gen_remove:prompt_${text}` : `e_gen_background_replace:prompt_${text}`;
    return cloudinary_1.cloudinary.url(publicId, { transformation: [{ raw_transformation: effect }], secure: true });
}
async function cleanupExpiredImageTools(maxAgeHours = 24) {
    const cutoff = Date.now() - maxAgeHours * 3600000;
    let cursor;
    let removed = 0;
    do {
        const page = await cloudinary_1.cloudinary.api.resources({ type: "upload", prefix: `${ROOT}/`, max_results: 500, next_cursor: cursor });
        const ids = page.resources.filter((item) => Date.parse(item.created_at) < cutoff).map((item) => item.public_id);
        for (let index = 0; index < ids.length; index += 100) {
            await cloudinary_1.cloudinary.api.delete_resources(ids.slice(index, index + 100), { invalidate: true });
            removed += Math.min(100, ids.length - index);
        }
        cursor = page.next_cursor;
    } while (cursor);
    return removed;
}
