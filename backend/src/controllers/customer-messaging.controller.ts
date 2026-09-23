import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as customerMessagingService from "../services/customer-messaging.service";

export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await customerMessagingService.sendCustomerMessage(req.user!.id, req.body);
  return res.json(result);
});