import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z.string().email(),
  callbackURL: z.string().optional(),
  errorCallbackURL: z.string().optional(),
});

export const roleGuardSchema = z.object({
  allow: z.array(
    z.enum(["platform_admin", "ops_lead", "department_lead", "employee"]),
  ),
});
