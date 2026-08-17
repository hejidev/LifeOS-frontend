"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadForProcessing = uploadForProcessing;
exports.buildTransformedUrl = buildTransformedUrl;
exports.buildFormatConvertedUrl = buildFormatConvertedUrl;
exports.buildGenerativeEditUrl = buildGenerativeEditUrl;
const cloudinary_1 = require("../config/cloudinary");
async function uploadForProcessing(buffer, originalName) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: "lifeos/image-tools", resource_type: "image" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return { publicId: uploaded.public_id, url: uploaded.secure_url, width: uploaded.width, height: uploaded.height };
}
const TRANSFORM_PRESETS = {
    REMOVE_BACKGROUND: "e_background_removal",
    UPSCALE: "e_upscale",
    ENHANCE: "e_improve,e_auto_contrast,e_auto_brightness",
    GRAYSCALE: "e_grayscale",
    SEPIA: "e_sepia",
};
function buildTransformedUrl(publicId, tool, format) {
    const transformation = TRANSFORM_PRESETS[tool];
    if (!transformation)
        throw new Error("Unknown image tool");
    return cloudinary_1.cloudinary.url(publicId, {
        transformation: [{ raw_transformation: transformation }],
        ...(format && { format }),
        secure: true,
    });
}
function buildFormatConvertedUrl(publicId, format, quality) {
    return cloudinary_1.cloudinary.url(publicId, { format, quality: quality ?? "auto", secure: true });
}
function buildGenerativeEditUrl(publicId, prompt, mode) {
    const op = mode === "remove" ? `e_gen_remove:prompt_${encodeURIComponent(prompt)}` : "e_gen_fill,b_gen_fill";
    return cloudinary_1.cloudinary.url(publicId, { transformation: [{ raw_transformation: op }], secure: true });
}
