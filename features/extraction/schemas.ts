import { z } from "zod";

export const startExtractionSchema = z.object({
  jobReleaseId: z.string().uuid(),
  intakeBatchId: z.string().uuid().optional(),
});

export const reviewExtractionSchema = z.object({
  extractionRunId: z.string().uuid(),
  expectedPanels: z.coerce.number().nonnegative(),
  releaseTotals: z.string().trim().min(1).max(500),
  materialTotals: z.string().trim().min(1).max(500),
  partTotals: z.string().trim().min(1).max(500),
  accessoryTotals: z.string().trim().min(1).max(500),
  dueDates: z.string().trim().max(1000),
  revisionNotes: z.string().trim().max(2000),
  additionalSummaryFields: z.string().trim().max(4000).optional(),
  reviewerNotes: z.string().trim().max(1000).optional(),
});

export const retryExtractionSchema = z.object({
  extractionRunId: z.string().uuid(),
});

export const bulkExtractionSchema = z.object({
  jobReleaseIds: z.array(z.string().uuid()).min(1).max(50),
});

export const extractionFailureReasonSchema = z.enum([
  "DOCUMENT_SET_INVALID",
  "OCR_QUALITY",
  "MODEL_FAILURE",
  "NORMALIZATION_ERROR",
  "TIMEOUT",
  "HUMAN_REVIEW_REQUIRED",
  "UNKNOWN",
]);

export const rejectExtractionSchema = z.object({
  extractionRunId: z.string().uuid(),
  failureReason: extractionFailureReasonSchema,
  failureTriageNotes: z.string().trim().max(1000).optional(),
  reviewerNotes: z.string().trim().max(1000).optional(),
});

export const bulkReviewSchema = z.object({
  extractionRunIds: z.array(z.string().uuid()).min(1).max(50),
  failureReason: extractionFailureReasonSchema.optional(),
  failureTriageNotes: z.string().trim().max(1000).optional(),
  reviewerNotes: z.string().trim().max(1000).optional(),
});

export const extractionQueueFilterSchema = z
  .enum([
    "ALL",
    "READY",
    "PENDING_REVIEW",
    "FAILED",
    "STALE_BASELINE",
    "APPROVED",
    "WAITING",
  ])
  .default("ALL");

export function readOptionalString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
