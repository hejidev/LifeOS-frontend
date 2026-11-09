import type { Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import { prisma } from "../config/prisma";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as loadTest from "../services/loadtest.service";
import * as traffic from "../services/traffic.service";
import * as workbench from "../services/workbench.service";

async function actorOf(req: AuthenticatedRequest) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
  return { id: req.user!.id, name: user?.name ?? "Super admin" };
}

export const getTraffic = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.query.window ?? "1h");
  if (!(key in traffic.WINDOWS)) throw new AppError("Unknown time window", 400);
  return res.json(await traffic.getTraffic(key as traffic.WindowKey));
});

export const getInstances = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ instances: await traffic.getInstances() });
});

export const probe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await loadTest.probeBalance(loadTest.baseUrlOf(req)));
});

export const fixtures = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(await loadTest.fixtureStatus());
});

export const seed = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(await loadTest.seedFixtures());
});

export const removeFixtures = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(await loadTest.removeFixtures());
});

export const listRuns = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ runs: await loadTest.listRuns() });
});

export const getRun = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await loadTest.getRun(req.params.id));
});

export const startRun = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const callerToken = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const actor = await actorOf(req);
  const id = await loadTest.startRun({ config: req.body, actorName: actor.name, base: loadTest.baseUrlOf(req), callerToken });
  return res.status(202).json({ id });
});

export const stopRun = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await loadTest.stopRun(req.params.id);
  return res.status(204).send();
});

export const queues = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(await workbench.queues());
});

export const search = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ accounts: await workbench.search(String(req.query.q ?? "")) });
});

export const account = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await workbench.getAccount(req.params.id));
});

export const addNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.status(201).json({ note: await workbench.addNote(await actorOf(req), req.params.id, req.body.body) });
});

export const deleteNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await workbench.deleteNote(req.params.noteId);
  return res.status(204).send();
});

export const merchantAction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await workbench.merchantAction(await actorOf(req), req.params.id, req.body.action, req.body.reason));
});