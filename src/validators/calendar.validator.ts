import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    allDay: z.boolean().optional(),
    location: z.string().max(200).optional(),
    type: z.enum(["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"]).optional(),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    allDay: z.boolean().optional(),
    location: z.string().max(200).optional(),
    type: z.enum(["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"]).optional(),
  }),
});