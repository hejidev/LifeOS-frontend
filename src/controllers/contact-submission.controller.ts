import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as contactSubmissionService from "../services/contact-submission.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  await contactSubmissionService.createSubmission(req.body);
  return res.status(201).json({ success: true });
});

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const submissions = await contactSubmissionService.listSubmissions(status);
  return res.json({ submissions });
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const submission = await contactSubmissionService.updateSubmissionStatus(req.params.id, req.body.status);
  return res.json({ submission });
});