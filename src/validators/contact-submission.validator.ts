import { z } from "zod";

export const createContactSubmissionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().max(150).optional(),
    message: z.string().trim().min(1).max(2000),
  }),
});

export const updateSubmissionStatusSchema = z.object({
  body: z.object({ status: z.enum(["NEW", "READ", "RESOLVED"]) }),
});