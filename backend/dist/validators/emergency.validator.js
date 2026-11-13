"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicUnlockSchema = exports.publicQuerySchema = exports.setPinSchema = exports.enableShareSchema = exports.reorderContactsSchema = exports.updateContactSchema = exports.createContactSchema = exports.updateEmergencyProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateEmergencyProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        dateOfBirth: zod_1.z.string().optional(),
        bloodType: zod_1.z.string().max(10).optional(),
        organDonor: zod_1.z.boolean().optional(),
        pregnancyStatus: zod_1.z.boolean().optional(),
        dnrStatus: zod_1.z.boolean().optional(),
        height: zod_1.z.string().max(20).optional(),
        weight: zod_1.z.string().max(20).optional(),
        preferredHospital: zod_1.z.string().max(200).optional(),
        physicianName: zod_1.z.string().max(150).optional(),
        physicianPhone: zod_1.z.string().max(30).optional(),
        insuranceProvider: zod_1.z.string().max(150).optional(),
        insurancePhone: zod_1.z.string().max(30).optional(),
        insurancePolicy: zod_1.z.string().max(100).optional(),
        allergies: zod_1.z.string().max(2000).optional(),
        conditions: zod_1.z.string().max(2000).optional(),
        medications: zod_1.z.string().max(2000).optional(),
        notes: zod_1.z.string().max(2000).optional(),
    }),
});
const blankToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const contactFields = {
    name: zod_1.z.string().trim().min(1).max(100),
    relationship: zod_1.z.preprocess(blankToUndefined, zod_1.z.string().trim().max(60).optional()),
    phone: zod_1.z.string().trim().min(5).max(30),
    email: zod_1.z.preprocess(blankToUndefined, zod_1.z.string().trim().email().optional()),
    canMakeMedicalDecisions: zod_1.z.boolean().optional(),
};
exports.createContactSchema = zod_1.z.object({ body: zod_1.z.object(contactFields) });
exports.updateContactSchema = zod_1.z.object({ body: zod_1.z.object(contactFields).partial() });
exports.reorderContactsSchema = zod_1.z.object({
    body: zod_1.z.object({ orderedIds: zod_1.z.array(zod_1.z.string().uuid()).min(1) }),
});
exports.enableShareSchema = zod_1.z.object({
    body: zod_1.z.object({ expiresInDays: zod_1.z.number().int().min(1).max(365).optional() }),
});
exports.setPinSchema = zod_1.z.object({
    body: zod_1.z.object({ pin: zod_1.z.string().regex(/^\d{4,8}$/).nullable() }),
});
exports.publicQuerySchema = zod_1.z.object({
    query: zod_1.z.object({ pin: zod_1.z.string().optional() }),
});
exports.publicUnlockSchema = zod_1.z.object({
    body: zod_1.z.object({ pin: zod_1.z.string().regex(/^\d{4,8}$/).optional() }).default({}),
    params: zod_1.z.object({ token: zod_1.z.string().min(20).max(80) }),
});
