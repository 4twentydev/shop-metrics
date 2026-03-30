import { z } from "zod";

export const releaseExtractionSummarySchema = z
  .object({
    expectedPanels: z.number().nonnegative(),
    releaseTotals: z.string().min(1).max(500),
    materialTotals: z.string().min(1).max(500),
    partTotals: z.string().min(1).max(500),
    accessoryTotals: z.string().min(1).max(500),
    dueDates: z.array(z.string()).default([]),
    revisionNotes: z.array(z.string()).default([]),
    additionalSummaryFields: z
      .array(
        z.object({
          label: z.string().min(1).max(120),
          value: z.string().min(1).max(500),
        }),
      )
      .default([]),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const extractionAssistPayloadSchema = z
  .object({
    releaseCode: z.string().optional(),
    revisionCode: z.string().optional(),
    customerName: z.string().optional(),
    productName: z.string().optional(),
    summary: releaseExtractionSummarySchema,
  })
  .strict();

export type ExtractionAssistPayload = z.infer<
  typeof extractionAssistPayloadSchema
>;

export function normalizeExtractionPayload(payload: unknown) {
  return extractionAssistPayloadSchema.parse(payload);
}
