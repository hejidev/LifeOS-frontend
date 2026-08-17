import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { env } from "../config/env";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);

  return res.status(500).json({
    error: "Something went wrong",
    ...(env.NODE_ENV !== "production" && err instanceof Error
      ? { detail: err.message }
      : {}),
  });
}