import type { Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as family from "../services/family-space.service";

export const setupSchema = z.object({ body: z.object({ consent: z.literal(true) }) });

export const createChildSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(40),
    password: z.string().min(6).max(64),
  }),
});

export const passwordSchema = z.object({ body: z.object({ password: z.string().min(6).max(64) }) });

export const schedulesSchema = z.object({
  body: z.object({
    schedules: z
      .array(
        z.object({
          label: z.string().trim().max(40).optional(),
          days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
          startMin: z.number().int().min(0).max(1439),
          endMin: z.number().int().min(0).max(1439),
          enabled: z.boolean(),
        })
      )
      .max(5),
  }),
});

export const overrideSchema = z.object({
  body: z.object({
    kind: z.enum(["LOCK", "UNLOCK"]),
    minutes: z.number().int().min(5).max(720),
  }),
});

export const messageSchema = z.object({ body: z.object({ body: z.string().trim().min(1).max(1000) }) });

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await family.getMe(req.user!.id)));

export const setup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await family.setupFamily(req.user!.id)));

export const members = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json({ members: await family.listMembers(req.user!.id) }));

export const createChild = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ child: await family.createChild(req.user!.id, req.body) })
);

export const resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.resetChildPassword(req.user!.id, req.params.memberId, req.body.password);
  return res.status(204).send();
});

export const deleteChild = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.deleteChild(req.user!.id, req.params.memberId);
  return res.status(204).send();
});

export const saveSchedules = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.saveSchedules(req.user!.id, req.params.memberId, req.body.schedules);
  return res.status(204).send();
});

export const setOverride = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.setOverride(req.user!.id, req.params.memberId, req.body.kind, req.body.minutes);
  return res.status(204).send();
});

export const clearOverride = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.clearOverride(req.user!.id, req.params.memberId);
  return res.status(204).send();
});

export const threads = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json({ threads: await family.listThreads(req.user!.id) }));

export const messages = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ messages: await family.listMessages(req.user!.id, req.params.key) })
);

export const send = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ message: await family.sendMessage(req.user!.id, req.params.key, req.body.body) })
);

export const read = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await family.markRead(req.user!.id, req.params.key);
  return res.status(204).send();
});