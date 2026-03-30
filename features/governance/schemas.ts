import { z } from "zod";

export const notificationEventTypeSchema = z.enum([
  "STALE_BASELINE",
  "FAILED_EXTRACTION",
  "DISPLAY_STALE_HEARTBEAT",
]);

export const notificationChannelSchema = z.enum(["IN_APP", "EMAIL"]);

export const notificationPreferenceSchema = z.object({
  preferenceId: z.string().uuid().nullable().optional(),
  userId: z.string().min(1),
  eventType: notificationEventTypeSchema,
  channel: notificationChannelSchema,
  isEnabled: z.boolean().default(true),
  minimumRepeatMinutes: z.coerce.number().int().min(5).max(1440),
});

export const escalationPolicySchema = z.object({
  policyId: z.string().uuid().nullable().optional(),
  eventType: notificationEventTypeSchema,
  channel: notificationChannelSchema,
  roleSlug: z.string().trim().min(1).max(64),
  escalationOrder: z.coerce.number().int().min(1).max(10),
  repeatMinutes: z.coerce.number().int().min(5).max(1440),
  isActive: z.boolean().default(true),
});
