import { z } from "zod";

export const createWorkEntrySchema = z.object({
  jobReleaseId: z.string().uuid(),
  nativeQuantity: z.coerce.number().positive().max(999999),
  isRework: z.coerce.boolean().default(false),
  faultDepartmentId: z.string().uuid().optional(),
  fixingDepartmentId: z.string().uuid().optional(),
  reworkNotes: z.string().trim().max(500).optional(),
});

export const updateWorkEntrySchema = z.object({
  workEntryId: z.string().uuid(),
  nativeQuantity: z.coerce.number().positive().max(999999),
  isRework: z.coerce.boolean().default(false),
  faultDepartmentId: z.string().uuid().optional(),
  fixingDepartmentId: z.string().uuid().optional(),
  reworkNotes: z.string().trim().max(500).optional(),
  editReason: z.string().trim().min(3).max(300),
});

export const verifyWorkEntrySchema = z.object({
  workEntryId: z.string().uuid(),
  comment: z.string().trim().max(300).optional(),
});

export const commentOnWorkEntrySchema = z.object({
  workEntryId: z.string().uuid(),
  body: z.string().trim().min(2).max(500),
});

export const submitShiftSchema = z.object({
  submissionId: z.string().uuid(),
});

export const reopenShiftSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
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

export function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
