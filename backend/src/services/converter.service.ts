import Papa from "papaparse";
import yaml from "js-yaml";
import mammoth from "mammoth";
import { AppError } from "../lib/errors";
import { convertBuffer } from "./cloudconvert.service";

const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const MAX_TEXT = 500_000;

export const INPUT_EXTENSIONS = [
  "doc", "docx", "odt", "rtf", "txt", "html", "pdf",
  "xls", "xlsx", "ods", "csv",
  "ppt", "pptx", "odp",
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic", "svg",
  "mp3", "wav", "m4a", "ogg", "flac",
  "mp4", "mov", "webm", "avi", "mkv",
];

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export const isSupportedInput = (name: string) => INPUT_EXTENSIONS.includes(extensionOf(name));

function parseSource(content: string, from: string): unknown {
  try {
    if (from === "json") return JSON.parse(content);
    if (from === "yaml") return yaml.load(content, { schema: yaml.CORE_SCHEMA });

    const parsed = Papa.parse<Record<string, unknown>>(content.trim(), { header: true, skipEmptyLines: "greedy" });
    if (parsed.data.length === 0) throw new Error("empty");
    return parsed.data;
  } catch {
    throw new AppError(`That doesn't look like valid ${from.toUpperCase()}.`, 422);
  }
}

function toRows(data: unknown) {
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : null;
  if (!list || list.length === 0) throw new AppError("CSV needs a list of records or a single object.", 422);

  return list.map((row): Record<string, unknown> => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return { value: row };
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value !== null && typeof value === "object" ? JSON.stringify(value) : value]));
  });
}

export function convertText(content: string, from: string, to: string): string {
  const data = parseSource(content, from);

  if (to === "json") return JSON.stringify(data, null, 2);
  if (to === "yaml") return yaml.dump(data, { lineWidth: 120, noRefs: true });
  if (to === "csv") {
    const rows = toRows(data);
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return Papa.unparse({ fields: columns, data: rows.map((row) => columns.map((column) => row[column] ?? "")) });
  }
  throw new AppError("Unsupported target format", 400);
}

const isPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";
const isZip = (buffer: Buffer) => buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b;

export async function extractPdfText(buffer: Buffer) {
  if (!isPdf(buffer)) throw new AppError("That doesn't look like a PDF file.", 422);

  let result: Awaited<ReturnType<typeof pdfParse>>;
  try {
    result = await pdfParse(buffer);
  } catch {
    throw new AppError("We couldn't read that PDF. It may be damaged or password protected.", 422);
  }

  const text = result.text.replace(/\r\n/g, "\n").trim();
  if (!text) throw new AppError("No text found. This looks like a scanned PDF, which needs OCR.", 422);
  return { text: text.slice(0, MAX_TEXT), pages: result.numpages, truncated: text.length > MAX_TEXT };
}

export async function extractDocxText(buffer: Buffer) {
  if (!isZip(buffer)) throw new AppError("That doesn't look like a DOCX file.", 422);

  let value: string;
  try {
    value = (await mammoth.extractRawText({ buffer })).value;
  } catch {
    throw new AppError("We couldn't read that document. It may be damaged.", 422);
  }

  const text = value.replace(/\r\n/g, "\n").trim();
  if (!text) throw new AppError("No text found in that document.", 422);
  return { text: text.slice(0, MAX_TEXT), truncated: text.length > MAX_TEXT };
}

export async function convertGenericFile(buffer: Buffer, fileName: string, targetFormat: string) {
  if (!isSupportedInput(fileName)) throw new AppError("That file type isn't supported for conversion.", 415);
  if (extensionOf(fileName) === targetFormat) throw new AppError("The file is already in that format.", 400);
  return convertBuffer(buffer, fileName, targetFormat);
}