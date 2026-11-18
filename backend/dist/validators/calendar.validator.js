"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
const EVENT_TYPES = ["MEETING", "PERSONAL", "DEADLINE", "REMINDER", "OTHER"];
const instant = zod_1.z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");
const fields = {
    title: zod_1.z.string().trim().min(1, "Give the event a title").max(150),
    description: zod_1.z.string().trim().max(2000),
    start: instant,
    end: instant,
    allDay: zod_1.z.boolean(),
    location: zod_1.z.string().trim().max(200),
    type: zod_1.z.enum(EVENT_TYPES),
};
const endsAfterStart = (value) => !value.start || !value.end || Date.parse(value.end) >= Date.parse(value.start);
const endMessage = { message: "The event can't end before it starts", path: ["end"] };
exports.createEventSchema = zod_1.z.object({
    body: zod_1.z
        .object({ ...fields, description: fields.description.optional(), allDay: fields.allDay.optional(), location: fields.location.optional(), type: fields.type.optional() })
        .refine(endsAfterStart, endMessage),
});
exports.updateEventSchema = zod_1.z.object({
    body: zod_1.z.object(fields).partial().refine(endsAfterStart, endMessage),
});
