import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import * as siteContentService from "../services/site-content.service";

export const getTeam = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ team: await siteContentService.listTeam() });
});
export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  return res.status(201).json({ member: await siteContentService.createTeamMember(req.body) });
});
export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  return res.json({ member: await siteContentService.updateTeamMember(req.params.id, req.body) });
});
export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  await siteContentService.deleteTeamMember(req.params.id);
  return res.status(204).send();
});

export const getTestimonials = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ testimonials: await siteContentService.listTestimonials() });
});
export const createTestimonial = asyncHandler(async (req: Request, res: Response) => {
  return res.status(201).json({ testimonial: await siteContentService.createTestimonial(req.body) });
});
export const updateTestimonial = asyncHandler(async (req: Request, res: Response) => {
  return res.json({ testimonial: await siteContentService.updateTestimonial(req.params.id, req.body) });
});
export const deleteTestimonial = asyncHandler(async (req: Request, res: Response) => {
  await siteContentService.deleteTestimonial(req.params.id);
  return res.status(204).send();
});