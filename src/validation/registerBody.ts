import { z } from "zod";

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  termsAccepted: z.literal(true),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
