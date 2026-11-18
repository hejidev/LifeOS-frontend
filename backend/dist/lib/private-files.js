"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnPrivateUrl = isOwnPrivateUrl;
exports.uploadPrivate = uploadPrivate;
exports.streamPrivate = streamPrivate;
exports.destroyPrivate = destroyPrivate;
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const cloudinary_1 = require("../config/cloudinary");
const errors_1 = require("./errors");
function isOwnPrivateUrl(url, folder) {
    if (!url)
        return false;
    try {
        const parsed = new URL(url);
        const cloud = cloudinary_1.cloudinary.config().cloud_name;
        return (parsed.protocol === "https:" &&
            parsed.hostname === "res.cloudinary.com" &&
            parsed.pathname.startsWith(`/${cloud}/`) &&
            parsed.pathname.includes("/authenticated/") &&
            parsed.pathname.includes(`/${folder}/`));
    }
    catch {
        return false;
    }
}
function uploadPrivate(buffer, folder, mimeType) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder, resource_type: mimeType.startsWith("image/") ? "image" : "raw", type: "authenticated" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
}
async function streamPrivate(url, meta, res) {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!upstream.ok || !upstream.body)
        throw new errors_1.AppError("The file couldn't be retrieved", 502);
    const fileName = (meta.fileName ?? "file").replace(/[^\w.\- ]+/g, "_");
    res.setHeader("Content-Type", meta.fileType || upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await (0, promises_1.pipeline)(stream_1.Readable.fromWeb(upstream.body), res);
}
async function destroyPrivate(url) {
    try {
        const match = new URL(url).pathname.match(/^\/[^/]+\/(image|raw|video)\/authenticated\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/);
        if (!match)
            return;
        const resourceType = match[1];
        const publicId = decodeURIComponent(resourceType === "raw" ? match[2] : match[2].replace(/\.[^/.]+$/, ""));
        await cloudinary_1.cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: "authenticated", invalidate: true });
    }
    catch (err) {
        console.error("[private-files] destroy failed:", err.message);
    }
}
