"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertText = convertText;
exports.extractPdfText = extractPdfText;
exports.extractDocxText = extractDocxText;
exports.convertGenericFile = convertGenericFile;
const papaparse_1 = __importDefault(require("papaparse"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const mammoth_1 = __importDefault(require("mammoth"));
const cloudinary_1 = require("../config/cloudinary");
const cloudconvert_service_1 = require("./cloudconvert.service");
function convertText(content, from, to) {
    let data;
    if (from === "json")
        data = JSON.parse(content);
    else if (from === "csv")
        data = papaparse_1.default.parse(content, { header: true }).data;
    else if (from === "yaml")
        data = js_yaml_1.default.load(content);
    else
        throw new Error("Unsupported source format");
    if (to === "json")
        return JSON.stringify(data, null, 2);
    if (to === "csv")
        return papaparse_1.default.unparse(data);
    if (to === "yaml")
        return js_yaml_1.default.dump(data);
    throw new Error("Unsupported target format");
}
const pdfParse = require("pdf-parse");
async function extractPdfText(buffer) {
    const result = await pdfParse(buffer);
    return { text: result.text, pages: result.numpages };
}
async function extractDocxText(buffer) {
    const result = await mammoth_1.default.extractRawText({ buffer });
    return { text: result.value };
}
async function convertGenericFile(buffer, fileName, targetFormat) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: "lifeos/converter-uploads", resource_type: "raw" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return (0, cloudconvert_service_1.convertFile)(uploaded.secure_url, fileName, targetFormat);
}
