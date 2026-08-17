import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import * as utilitiesService from "../services/utilities.service";

export const getExchangeRates = asyncHandler(async (req: Request, res: Response) => {
  const base = (req.query.base as string) ?? "USD";
  const data = await utilitiesService.getExchangeRates(base);
  return res.json(data);
});

export const translateText = asyncHandler(async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  const translated = await utilitiesService.translateText(text, targetLanguage);
  return res.json({ translated });
});