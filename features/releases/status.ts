import { z } from "zod";

export const releaseStatusSchema = z.enum([
  "PENDING_BASELINE",
  "READY",
  "IN_PRODUCTION",
  "SUBMITTED",
  "LOCKED",
  "ARCHIVED",
]);

export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;

const allowedTransitions: Record<ReleaseStatus, ReleaseStatus[]> = {
  PENDING_BASELINE: ["READY", "ARCHIVED"],
  READY: ["IN_PRODUCTION", "ARCHIVED"],
  IN_PRODUCTION: ["SUBMITTED", "READY"],
  SUBMITTED: ["LOCKED", "READY"],
  LOCKED: ["READY", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionRelease(
  currentStatus: ReleaseStatus,
  nextStatus: ReleaseStatus,
) {
  return allowedTransitions[currentStatus].includes(nextStatus);
}
