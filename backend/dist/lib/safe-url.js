"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkUrl = exports.webUrl = void 0;
exports.isWebUrl = isWebUrl;
exports.isLinkUrl = isLinkUrl;
const zod_1 = require("zod");
function parse(value) {
    try {
        return new URL(value);
    }
    catch {
        return null;
    }
}
function isWebUrl(value) {
    const url = parse(value);
    return !!url && (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
}
function isLinkUrl(value) {
    if (isWebUrl(value))
        return true;
    const url = parse(value);
    return !!url && (url.protocol === "mailto:" || url.protocol === "tel:") && url.pathname.length > 0;
}
exports.webUrl = zod_1.z.string().trim().max(2048).refine(isWebUrl, "Enter a link that starts with http:// or https://");
exports.linkUrl = zod_1.z.string().trim().max(2048).refine(isLinkUrl, "Enter a link that starts with http://, https://, mailto: or tel:");
