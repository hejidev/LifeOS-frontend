import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiWritingService from "../services/ai-writing.service";

export const streamWritingHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { mode, input, tone, targetLanguage } = req.body;
  let wroteAnything = false;

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    await aiWritingService.streamWriting(mode, input, { tone, targetLanguage }, (chunk) => {
      wroteAnything = true;
      res.write(chunk);
    });
    res.end();
  } catch (err: any) {
    console.error("[ai-writing] stream failed:", err?.message ?? err);
    if (!wroteAnything && !res.headersSent) {
      res.status(err?.status === 401 ? 401 : 502).json({
        error: err?.error?.message ?? err?.message ?? "Failed to generate — check backend logs for details",
      });
    } else {
      res.end();
    }
  }
});

export const saveDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doc = await aiWritingService.saveDocument(req.user!.id, req.body);
  return res.status(201).json({ document: doc });
});

export const getDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const docs = await aiWritingService.getDocuments(req.user!.id);
  return res.json({ documents: docs });
});

export const deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await aiWritingService.deleteDocument(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const convertToNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const note = await aiWritingService.convertToNote(req.user!.id, req.params.id);
  return res.status(201).json({ note });
});