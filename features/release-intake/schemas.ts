import { z } from "zod";

export const jobNumberSchema = z.string().regex(/^\d{5}$/);
export const releaseCodeSchema = z.string().regex(/^(R|RMK|RME|A)\d+$/);

export const intakeManifestItemSchema = z.object({
  index: z.number().int().nonnegative(),
  kind: z.enum(["BASELINE_PDF", "REVISION_PDF", "ROUTER_PDF", "QUALITY_PDF"]),
  documentFamily: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/),
  affectsBaseline: z.boolean(),
  uploaderNotes: z.string().trim().max(300).optional(),
});

export const uploadReleaseDocumentsSchema = z.object({
  jobReleaseId: z.string().uuid(),
  uploadLabel: z.string().trim().min(3).max(120),
  notes: z.string().trim().max(500).optional(),
  documentManifest: z.array(intakeManifestItemSchema).min(1),
});

export const reviewDocumentDecisionSchema = z
  .object({
    documentId: z.string().uuid(),
    decision: z.enum(["SUPERSEDE", "KEEP_REFERENCE"]),
    supersedesDocumentId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "SUPERSEDE" && !value.supersedesDocumentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supersedesDocumentId"],
        message: "A superseded document must be selected.",
      });
    }
  });

export const addReleaseCommentSchema = z.object({
  jobReleaseId: z.string().uuid(),
  intakeBatchId: z.string().uuid().optional(),
  body: z.string().trim().min(2).max(500),
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
