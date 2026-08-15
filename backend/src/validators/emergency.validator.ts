import { z } from "zod";

export const updateEmergencyProfileSchema = z.object({
  body: z.object({
    dateOfBirth: z.string().optional(),
    bloodType: z.string().max(10).optional(),
    organDonor: z.boolean().optional(),
    pregnancyStatus: z.boolean().optional(),
    dnrStatus: z.boolean().optional(),
    height: z.string().max(20).optional(),
    weight: z.string().max(20).optional(),
    preferredHospital: z.string().max(200).optional(),
    physicianName: z.string().max(150).optional(),
    physicianPhone: z.string().max(30).optional(),
    insuranceProvider: z.string().max(150).optional(),
    insurancePhone: z.string().max(30).optional(),
    insurancePolicy: z.string().max(100).optional(),
    allergies: z.string().max(2000).optional(),
    conditions: z.string().max(2000).optional(),
    medications: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const createContactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    relationship: z.string().max(50).optional(),
    phone: z.string().trim().min(1).max(30),
    email: z.string().email().optional(),
    canMakeMedicalDecisions: z.boolean().optional(),
  }),
});

export const updateContactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    relationship: z.string().max(50).optional(),
    phone: z.string().trim().min(1).max(30).optional(),
    email: z.string().email().optional(),
    canMakeMedicalDecisions: z.boolean().optional(),
  }),
});

export const reorderContactsSchema = z.object({
  body: z.object({ orderedIds: z.array(z.string().uuid()).min(1) }),
});

export const enableShareSchema = z.object({
  body: z.object({ expiresInDays: z.number().int().min(1).max(365).optional() }),
});

export const setPinSchema = z.object({
  body: z.object({ pin: z.string().regex(/^\d{4,8}$/).nullable() }),
});

export const publicQuerySchema = z.object({
  query: z.object({ pin: z.string().optional() }),
});