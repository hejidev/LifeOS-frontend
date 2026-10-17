import { z } from "zod";

export const createShiftSchema = z.object({
  body: z
    .object({
      staffId: z.string().uuid(),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
      storeId: z.string().uuid().optional(),
      note: z.string().trim().max(300).optional(),
    })
    .refine((d) => new Date(d.endsAt).getTime() > new Date(d.startsAt).getTime(), {
      message: "Shift end time must be after the start time",
      path: ["endsAt"],
    }),
});

export const updateShiftSchema = z.object({
  body: z.object({
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
    storeId: z.string().uuid().optional(),
    note: z.string().trim().max(300).optional(),
  }),
});