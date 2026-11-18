import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiWritingService from "../services/ai-writing.service";

export const streamWritingHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { mode, input, tone, targetLanguage } = req.body;
  let aborted = false;
  let started = false;
  res.on("close", () => {
    if (!res.writableEnded) aborted = true;
  });

  try {
    await aiWritingService.streamWriting(
      mode,
      input,
      { tone, targetLanguage },
      (chunk) => {
        if (!started) {
          started = true;
          res.status(200);
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("X-Accel-Buffering", "no");
        }
        res.write(chunk);
      },
      () => aborted
    );
    res.end();
  } catch (error) {
    if (!started) throw error;
    res.end();
  }
});

export const saveDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ document: await aiWritingService.saveDocument(req.user!.id, req.body) })
);

export const getDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ documents: await aiWritingService.getDocuments(req.user!.id) })
);

export const deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await aiWritingService.deleteDocument(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const convertToNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ note: await aiWritingService.convertToNote(req.user!.id, req.params.id) })
);