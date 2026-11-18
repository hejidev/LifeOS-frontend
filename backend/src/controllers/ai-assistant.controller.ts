import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as aiContextService from "../services/ai-context.service";
import * as assistantContext from "../services/assistant-context.service";
import * as assistant from "../services/ai-assistant.service";

export const getContext = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json(await assistantContext.getAssistantContext(req.user!.id))
);

export const getFocusSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ suggestions: await aiContextService.getFocusSuggestions(req.user!.id) })
);

export const listConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ conversations: await assistant.listConversations(req.user!.id) })
);

export const getConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ conversation: await assistant.getConversation(req.user!.id, req.params.id) })
);

export const deleteConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await assistant.deleteConversation(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const streamReply = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message, conversationId } = req.body as { message: string; conversationId?: string };
  let aborted = false;
  let started = false;
  res.on("close", () => {
    if (!res.writableEnded) aborted = true;
  });

  try {
    await assistant.streamAssistantReply({
      userId: req.user!.id,
      message,
      conversationId,
      isAborted: () => aborted,
      onStart: (id) => {
        started = true;
        res.status(200);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        res.setHeader("X-Conversation-Id", id);
      },
      onDelta: (text) => res.write(text),
    });
    res.end();
  } catch (error) {
    if (!started) throw error;
    res.end();
  }
});