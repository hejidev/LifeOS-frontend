import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errors";

export function singleUpload(
  field: string,
  options: { maxBytes: number; allow?: (file: Express.Multer.File) => boolean; rejectMessage?: string }
) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!options.allow || options.allow(file)) return cb(null, true);
      cb(new AppError(options.rejectMessage ?? "That file type isn't allowed", 415) as unknown as Error);
    },
  }).single(field);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const tooLarge = err.code === "LIMIT_FILE_SIZE";
        return next(new AppError(tooLarge ? `That file is larger than ${Math.round(options.maxBytes / 1_048_576)} MB.` : "The upload failed. Please try again.", tooLarge ? 413 : 400));
      }
      next(err);
    });
  };
}