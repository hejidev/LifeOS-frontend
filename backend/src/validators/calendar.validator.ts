import { z } from "zod";

const EVENT_TYPES = ["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"] as const;
const instant = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

const fields = {
  title: z.string().trim().min(1, "Give the event a title").max(150),
  description: z.string().trim().max(2000),
  start: instant,
  end: instant,
  allDay: z.boolean(),
  location: z.string().trim().max(200),
  type: z.enum(EVENT_TYPES),
};

const endsAfterStart = (value: { start?: string; end?: string }) =>
  !value.start || !value.end || Date.parse(value.end) >= Date.parse(value.start);

const endMessage = { message: "The event can't end before it starts", path: ["end"] };

export const createEventSchema = z.object({
  body: z
    .object({ ...fields, description: fields.description.optional(), allDay: fields.allDay.optional(), location: fields.location.optional(), type: fields.type.optional() })
    .refine(endsAfterStart, endMessage),
});

export const updateEventSchema = z.object({
  body: z.object(fields).partial().refine(endsAfterStart, endMessage),
});