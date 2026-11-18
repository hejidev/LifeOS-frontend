"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedInput = exports.INPUT_EXTENSIONS = void 0;
exports.convertText = convertText;
exports.extractPdfText = extractPdfText;
exports.extractDocxText = extractDocxText;
exports.convertGenericFile = convertGenericFile;
const papaparse_1 = __importDefault(require("papaparse"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const mammoth_1 = __importDefault(require("mammoth"));
const errors_1 = require("../lib/errors");
const cloudconvert_service_1 = require("./cloudconvert.service");
const pdfParse = require("pdf-parse");
const MAX_TEXT = 500000;
exports.INPUT_EXTENSIONS = [
    "doc", "docx", "odt", "rtf", "txt", "html", "pdf",
    "xls", "xlsx", "ods", "csv",
    "ppt", "pptx", "odp",
    "jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic", "svg",
    "mp3", "wav", "m4a", "ogg", "flac",
    "mp4", "mov", "webm", "avi", "mkv",
];
const extensionOf = (name) => name.split(".").pop()?.toLowerCase() ?? "";
const isSupportedInput = (name) => exports.INPUT_EXTENSIONS.includes(extensionOf(name));
exports.isSupportedInput = isSupportedInput;
function parseSource(content, from) {
    try {
        if (from === "json")
            return JSON.parse(content);
        if (from === "yaml")
            return js_yaml_1.default.load(content, { schema: js_yaml_1.default.CORE_SCHEMA });
        const parsed = papaparse_1.default.parse(content.trim(), { header: true, skipEmptyLines: "greedy" });
        if (parsed.data.length === 0)
            throw new Error("empty");
        return parsed.data;
    }
    catch {
        throw new errors_1.AppError(`That doesn't look like valid ${from.toUpperCase()}.`, 422);
    }
}
function toRows(data) {
    const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : null;
    if (!list || list.length === 0)
        throw new errors_1.AppError("CSV needs a list of records or a single object.", 422);
    return list.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row))
            return { value: row };
        return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value !== null && typeof value === "object" ? JSON.stringify(value) : value]));
    });
}
function convertText(content, from, to) {
    const data = parseSource(content, from);
    if (to === "json")
        return JSON.stringify(data, null, 2);
    if (to === "yaml")
        return js_yaml_1.default.dump(data, { lineWidth: 120, noRefs: true });
    if (to === "csv") {
        const rows = toRows(data);
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        return papaparse_1.default.unparse({ fields: columns, data: rows.map((row) => columns.map((column) => row[column] ?? "")) });
    }
    throw new errors_1.AppError("Unsupported target format", 400);
}
const isPdf = (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";
const isZip = (buffer) => buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b;
async function extractPdfText(buffer) {
    if (!isPdf(buffer))
        throw new errors_1.AppError("That doesn't look like a PDF file.", 422);
    let result;
    try {
        result = await pdfParse(buffer);
    }
    catch {
        throw new errors_1.AppError("We couldn't read that PDF. It may be damaged or password protected.", 422);
    }
    const text = result.text.replace(/\r\n/g, "\n").trim();
    if (!text)
        throw new errors_1.AppError("No text found. This looks like a scanned PDF, which needs OCR.", 422);
    return { text: text.slice(0, MAX_TEXT), pages: result.numpages, truncated: text.length > MAX_TEXT };
}
async function extractDocxText(buffer) {
    if (!isZip(buffer))
        throw new errors_1.AppError("That doesn't look like a DOCX file.", 422);
    let value;
    try {
        value = (await mammoth_1.default.extractRawText({ buffer })).value;
    }
    catch {
        throw new errors_1.AppError("We couldn't read that document. It may be damaged.", 422);
    }
    const text = value.replace(/\r\n/g, "\n").trim();
    if (!text)
        throw new errors_1.AppError("No text found in that document.", 422);
    return { text: text.slice(0, MAX_TEXT), truncated: text.length > MAX_TEXT };
}
async function convertGenericFile(buffer, fileName, targetFormat) {
    if (!(0, exports.isSupportedInput)(fileName))
        throw new errors_1.AppError("That file type isn't supported for conversion.", 415);
    if (extensionOf(fileName) === targetFormat)
        throw new errors_1.AppError("The file is already in that format.", 400);
    return (0, cloudconvert_service_1.convertBuffer)(buffer, fileName, targetFormat);
}
