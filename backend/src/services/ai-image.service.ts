import { cloudinary } from "../config/cloudinary";

export async function uploadForProcessing(buffer: Buffer, originalName: string) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "lifeos/image-tools", resource_type: "image" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
  return { publicId: uploaded.public_id, url: uploaded.secure_url, width: uploaded.width, height: uploaded.height };
}

const TRANSFORM_PRESETS: Record<string, string> = {
  REMOVE_BACKGROUND: "e_background_removal",
  UPSCALE: "e_upscale",
  ENHANCE: "e_improve,e_auto_contrast,e_auto_brightness",
  GRAYSCALE: "e_grayscale",
  SEPIA: "e_sepia",
};

export function buildTransformedUrl(publicId: string, tool: string, format?: string) {
  const transformation = TRANSFORM_PRESETS[tool];
  if (!transformation) throw new Error("Unknown image tool");
  return cloudinary.url(publicId, {
    transformation: [{ raw_transformation: transformation }],
    ...(format && { format }),
    secure: true,
  });
}

export function buildFormatConvertedUrl(publicId: string, format: string, quality?: string) {
  return cloudinary.url(publicId, { format, quality: quality ?? "auto", secure: true });
}

export function buildGenerativeEditUrl(publicId: string, prompt: string, mode: "remove" | "fill") {
  const op = mode === "remove" ? `e_gen_remove:prompt_${encodeURIComponent(prompt)}` : "e_gen_fill,b_gen_fill";
  return cloudinary.url(publicId, { transformation: [{ raw_transformation: op }], secure: true });
}