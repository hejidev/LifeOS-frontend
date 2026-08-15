import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as notificationService from "../services/notification.service";

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const unreadOnly = req.query.unreadOnly === "true";
  const notifications = await notificationService.listNotifications(req.user!.id, unreadOnly);
  return res.json({ notifications });
});

export const unreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  return res.json({ count });
});

export const markRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await notificationService.markAsRead(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const markAllRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);
  return res.status(204).send();
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await notificationService.deleteNotification(req.user!.id, req.params.id);
  return res.status(204).send();
});