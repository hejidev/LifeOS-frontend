import type { Request, Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import { prisma } from "../config/prisma";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as register from "../services/register.service";
import * as storeService from "../services/store.service";

interface Context {
  scope: register.RegisterScope;
  actor: register.RegisterActor;
}

async function ownerContext(req: AuthenticatedRequest): Promise<Context> {
  const profile = await prisma.bizProfile.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
  if (!profile) throw new AppError("Merchant profile not found", 404);
  const requested = (req.body?.storeId ?? req.query.storeId) as string | undefined;
  const storeId = await storeService.resolveStoreId(req.user!.id, requested);
  return {
    scope: { bizProfileId: profile.id, storeId },
    actor: { type: "OWNER", id: req.user!.id, name: req.user!.name ?? "Owner" },
  };
}

async function staffContext(req: StaffRequest): Promise<Context> {
  const member = await prisma.bizStaff.findFirst({
    where: { id: req.staff!.staffId, bizProfileId: req.staff!.bizProfileId },
    select: { name: true },
  });
  if (!member) throw new AppError("Staff session not found", 404);
  const storeId = req.staff!.storeId as string | undefined;
  if (!storeId) throw new AppError("This staff account isn't linked to a location.", 400);
  return {
    scope: { bizProfileId: req.staff!.bizProfileId, storeId },
    actor: { type: "STAFF", id: req.staff!.staffId, name: member.name },
  };
}

function build<R extends Request>(context: (req: R) => Promise<Context>) {
  return {
    current: asyncHandler(async (req: Request, res: Response) => {
      const { scope } = await context(req as R);
      return res.json({ session: await register.getCurrent(scope) });
    }),
    open: asyncHandler(async (req: Request, res: Response) => {
      const { scope, actor } = await context(req as R);
      return res.status(201).json({ session: await register.open(scope, actor, req.body.openingFloat) });
    }),
    movement: asyncHandler(async (req: Request, res: Response) => {
      const { scope, actor } = await context(req as R);
      const { kind, amount, reason } = req.body;
      return res.json({ session: await register.addMovement(scope, actor, { kind, amount, reason }) });
    }),
    close: asyncHandler(async (req: Request, res: Response) => {
      const { scope, actor } = await context(req as R);
      return res.json({ session: await register.close(scope, actor, { countedCash: req.body.countedCash, note: req.body.note }) });
    }),
    history: asyncHandler(async (req: Request, res: Response) => {
      const { scope } = await context(req as R);
      return res.json({ sessions: await register.history(scope) });
    }),
  };
}

export const ownerRegister = build<AuthenticatedRequest>(ownerContext);
export const staffRegister = build<StaffRequest>(staffContext);