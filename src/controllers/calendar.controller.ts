import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as calendarService from "../services/calendar.service";

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = req.query.range as "today" | "week" | "month" | undefined;
  const events = await calendarService.listEvents(req.user!.id, range);
  return res.json({ events });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const event = await calendarService.createEvent(req.user!.id, req.body);
  return res.status(201).json({ event });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const event = await calendarService.updateEvent(req.user!.id, req.params.id, req.body);
  return res.json({ event });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await calendarService.deleteEvent(req.user!.id, req.params.id);
  return res.status(204).send();
});