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
