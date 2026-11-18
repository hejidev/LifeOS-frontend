import type { Response } from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { cloudinary } from "../config/cloudinary";
import { AppError } from "./errors";

export function isOwnPrivateUrl(url: string | null | undefined, folder: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const cloud = cloudinary.config().cloud_name;
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloud}/`) &&
      parsed.pathname.includes("/authenticated/") &&
      parsed.pathname.includes(`/${folder}/`)
    );
  } catch {
    return false;
  }
}

export function uploadPrivate(buffer: Buffer, folder: string, mimeType: string) {
  return new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: mimeType.startsWith("image/") ? "image" : "raw", type: "authenticated" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export async function streamPrivate(url: string, meta: { fileName?: string | null; fileType?: string | null }, res: Response) {
  const upstream = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!upstream.ok || !upstream.body) throw new AppError("The file couldn't be retrieved", 502);

  const fileName = (meta.fileName ?? "file").replace(/[^\w.\- ]+/g, "_");
  res.setHeader("Content-Type", meta.fileType || upstream.headers.get("content-type") || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  await pipeline(Readable.fromWeb(upstream.body as any), res);
}

export async function destroyPrivate(url: string) {
  try {
    const match = new URL(url).pathname.match(/^\/[^/]+\/(image|raw|video)\/authenticated\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/);
    if (!match) return;
    const resourceType = match[1];
    const publicId = decodeURIComponent(resourceType === "raw" ? match[2] : match[2].replace(/\.[^/.]+$/, ""));
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: "authenticated", invalidate: true });
  } catch (err) {
    console.error("[private-files] destroy failed:", (err as Error).message);
  }
}