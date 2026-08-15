// src/controllers/dm.controller.ts
import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as dmService from "../services/dm.service";

export const startConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId, message } = req.body;
  if (userId === req.user!.id) throw new AppError("You can't message yourself", 400);
  const msg = await dmService.sendMessage(req.user!.id, userId, message);
  return res.status(201).json({ message: msg });
});

export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const convo = await dmService.getConversationOrThrow(req.user!.id, req.params.conversationId);
  const recipientId = convo.participantAId === req.user!.id ? convo.participantBId : convo.participantAId;
  const msg = await dmService.sendMessage(req.user!.id, recipientId, req.body.body);
  return res.status(201).json({ message: msg });
});

export const listConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ conversations: await dmService.listConversations(req.user!.id) });
});

export const getMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ messages: await dmService.getMessages(req.user!.id, req.params.conversationId) });
});

export const contactSupport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const msg = await dmService.contactSupport(req.user!.id, req.body.message);
  return res.status(201).json({ message: msg });
});