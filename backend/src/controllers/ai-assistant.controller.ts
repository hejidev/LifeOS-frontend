import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiContextService from "../services/ai-context.service";
import * as aiAssistantService from "../services/ai-assistant.service";

function extractAnthropicErrorMessage(err: any): string {
  const raw = err?.message ?? "";
  const match = raw.match(/^\d+\s+(\{.*\})$/s);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
  }
  return raw || "Failed to generate a reply";
}

export const getContext = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const context = await aiContextService.getAIContext(req.user!.id);
  return res.json(context);
});

export const getFocusSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const suggestions = await aiContextService.getFocusSuggestions(req.user!.id);
  return res.json({ suggestions });
});

export const streamReply = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;
  let wroteAnything = false;

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    await aiAssistantService.streamAssistantReply(req.user!.id, req.user!.name ?? "there", message, (chunk) => {
      wroteAnything = true;
      res.write(chunk);
    });
    res.end();
  } catch (err: any) {
    const cleanMessage = extractAnthropicErrorMessage(err);
    console.error("[ai-assistant] stream failed:", cleanMessage);
    if (!wroteAnything && !res.headersSent) {
      res.status(typeof err?.status === "number" ? err.status : 502).json({ error: cleanMessage });
    } else {
      res.end();
    }
  }
});