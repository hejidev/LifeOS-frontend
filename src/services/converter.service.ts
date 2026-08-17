import Papa from "papaparse";
import yaml from "js-yaml";
import mammoth from "mammoth";
import { cloudinary } from "../config/cloudinary";
import { convertFile as ccConvert } from "./cloudconvert.service";

export function convertText(content: string, from: string, to: string): string {
  let data: any;
  if (from === "json") data = JSON.parse(content);
  else if (from === "csv") data = Papa.parse(content, { header: true }).data;
  else if (from === "yaml") data = yaml.load(content);
  else throw new Error("Unsupported source format");

  
  if (to === "json") return JSON.stringify(data, null, 2);
  if (to === "csv") return Papa.unparse(data);
  if (to === "yaml") return yaml.dump(data);
  throw new Error("Unsupported target format");
}

const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export async function extractPdfText(buffer: Buffer) {
  const result = await pdfParse(buffer);
  return { text: result.text, pages: result.numpages };
}

export async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

export async function convertGenericFile(buffer: Buffer, fileName: string, targetFormat: string) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "lifeos/converter-uploads", resource_type: "raw" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
  return ccConvert(uploaded.secure_url, fileName, targetFormat);
}