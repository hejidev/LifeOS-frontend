import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as chatService from "../services/chat.service";
import * as pushService from "../services/push.service";

function handlers<R extends Request>(actorOf: (req: R) => Promise<chatService.ChatActor>) {
  return {
    threads: asyncHandler(async (req: Request, res: Response) => {
      return res.json({ threads: await chatService.listThreads(await actorOf(req as R)) });
    }),
    messages: asyncHandler(async (req: Request, res: Response) => {
      const after = typeof req.query.after === "string" ? req.query.after : undefined;
      return res.json({ messages: await chatService.listMessages(await actorOf(req as R), req.params.threadId, after) });
    }),
    send: asyncHandler(async (req: Request, res: Response) => {
      const message = await chatService.sendMessage(await actorOf(req as R), req.params.threadId, req.body.body);
      return res.status(201).json({ message });
    }),
    read: asyncHandler(async (req: Request, res: Response) => {
      await chatService.markRead(await actorOf(req as R), req.params.threadId);
      return res.status(204).send();
    }),
    unread: asyncHandler(async (req: Request, res: Response) => {
      return res.json({ count: await chatService.unreadTotal(await actorOf(req as R)) });
    }),
  };
}

export const ownerChat = handlers<AuthenticatedRequest>((req) => chatService.ownerActor(req.user!.id, req.user!.name));
export const staffChat = handlers<StaffRequest>((req) => chatService.staffActor(req.staff!.staffId, req.staff!.bizProfileId));

export const registerOwnerPush = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await pushService.registerUserToken(req.user!.id, req.body.token, req.body.platform);
  return res.status(204).send();
});

export const removeOwnerPush = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await pushService.removeUserToken(req.user!.id, req.body.token);
  return res.status(204).send();
});

export const registerStaffPush = asyncHandler(async (req: StaffRequest, res: Response) => {
  await pushService.registerStaffToken(req.staff!.staffId, req.staff!.bizProfileId, req.body.token, req.body.platform);
  return res.status(204).send();
});

export const removeStaffPush = asyncHandler(async (req: StaffRequest, res: Response) => {
  await pushService.removeStaffToken(req.staff!.staffId, req.body.token);
  return res.status(204).send();
});