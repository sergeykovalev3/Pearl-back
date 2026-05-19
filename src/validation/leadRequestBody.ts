import { z } from "zod";

export const patientWelcomeLeadSchema = z.object({
  source: z.literal("patient-welcome"),
  phone: z.string().trim().min(1).max(32),
});

export const careContactLeadSchema = z.object({
  source: z.literal("care-contact"),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(128),
});

export const leadRequestBodySchema = z.discriminatedUnion("source", [
  patientWelcomeLeadSchema,
  careContactLeadSchema,
]);

export type LeadRequestBody = z.infer<typeof leadRequestBodySchema>;
