import { cloudinary } from "../config/cloudinary";
import { AppError } from "../lib/errors";

const ROOT = "lifeos/image-tools";
const folderOf = (userId: string) => `${ROOT}/${userId}`;

export function assertOwnImage(userId: string, publicId: string) {
  if (!publicId.startsWith(`${folderOf(userId)}/`) || publicId.includes("..")) throw new AppError("Image not found", 404);
}

export async function uploadForProcessing(userId: string, buffer: Buffer) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderOf(userId), resource_type: "image" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
  return { publicId: uploaded.public_id, url: uploaded.secure_url, width: uploaded.width, height: uploaded.height };
}

const PRESETS: Record<string, string> = {
  REMOVE_BACKGROUND: "e_background_removal",
  UPSCALE: "e_upscale",
  ENHANCE: "e_improve,e_auto_contrast,e_auto_brightness",
  GRAYSCALE: "e_grayscale",
  SEPIA: "e_sepia",
};

export function buildTransformedUrl(publicId: string, tool: string, format?: string) {
  const transformation = PRESETS[tool];
  if (!transformation) throw new AppError("Unknown image tool", 400);
  return cloudinary.url(publicId, { transformation: [{ raw_transformation: transformation }], ...(format && { format }), secure: true });
}

export function buildFormatConvertedUrl(publicId: string, format: string, quality?: string) {
  return cloudinary.url(publicId, { format, quality: quality ?? "auto", secure: true });
}

export function buildGenerativeEditUrl(publicId: string, prompt: string, mode: "remove" | "fill") {
  const text = encodeURIComponent(prompt.replace(/[\r\n]+/g, " ").trim());
  const effect = mode === "remove" ? `e_gen_remove:prompt_${text}` : `e_gen_background_replace:prompt_${text}`;
  return cloudinary.url(publicId, { transformation: [{ raw_transformation: effect }], secure: true });
}

export async function cleanupExpiredImageTools(maxAgeHours = 24) {
  const cutoff = Date.now() - maxAgeHours * 3_600_000;
  let cursor: string | undefined;
  let removed = 0;

  do {
    const page: any = await cloudinary.api.resources({ type: "upload", prefix: `${ROOT}/`, max_results: 500, next_cursor: cursor });
    const ids: string[] = page.resources.filter((item: any) => Date.parse(item.created_at) < cutoff).map((item: any) => item.public_id);
    for (let index = 0; index < ids.length; index += 100) {
      await cloudinary.api.delete_resources(ids.slice(index, index + 100), { invalidate: true });
      removed += Math.min(100, ids.length - index);
    }
    cursor = page.next_cursor;
  } while (cursor);

  return removed;
}