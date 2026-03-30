import { z } from "zod";

export const extractionAssistPayloadSchema = z.object({
  revisionCode: z.string().optional(),
  releaseCode: z.string().optional(),
  customerName: z.string().optional(),
  productName: z.string().optional(),
  panelBaseline: z.number().nonnegative().optional(),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export type ExtractionAssistPayload = z.infer<
  typeof extractionAssistPayloadSchema
>;

export function normalizeExtractionPayload(payload: unknown) {
  return extractionAssistPayloadSchema.parse(payload);
}
