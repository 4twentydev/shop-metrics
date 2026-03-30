import { z } from "zod";

import { metricScopeValues, metricWindowValues } from "@/features/metrics/types";

import { reportDatasetValues, reportExportFormatValues, reportViewValues } from "./types";

export const reportViewSchema = z.enum(reportViewValues);
export const reportDatasetSchema = z.enum(reportDatasetValues);
export const reportExportFormatSchema = z.enum(reportExportFormatValues);

export const reportFilterSchema = z.object({
  view: reportViewSchema,
  windowType: z.enum(metricWindowValues).default("DAILY"),
  anchorDate: z.string().date(),
  scopeKey: z.string().trim().min(1).max(128).nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
});

export const reportTemplateSchema = z.object({
  templateId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(300).nullable().optional(),
  viewType: reportViewSchema,
  defaultWindowType: z.enum(metricWindowValues),
  scopeType: z.enum(metricScopeValues).nullable().optional(),
  scopeKey: z.string().trim().max(128).nullable().optional(),
  includeSummary: z.boolean().default(true),
  includeRaw: z.boolean().default(true),
  includePivot: z.boolean().default(true),
  highlightAccountability: z.boolean().default(false),
  highlightBottlenecks: z.boolean().default(false),
  mobileCondensed: z.boolean().default(true),
  isPinned: z.boolean().default(false),
});

export const exportRequestSchema = z.object({
  view: reportViewSchema,
  windowType: z.enum(metricWindowValues),
  anchorDate: z.string().date(),
  format: reportExportFormatSchema,
  dataset: reportDatasetSchema.default("summary"),
  scopeKey: z.string().trim().min(1).max(128).nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
});

export const displayPlaylistSchema = z.object({
  playlistId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(300).nullable().optional(),
  rotationSeconds: z.coerce.number().int().min(10).max(300),
  heartbeatIntervalSeconds: z.coerce.number().int().min(15).max(300),
  departmentCode: z.string().trim().max(32).nullable().optional(),
  shiftCode: z.string().trim().max(32).nullable().optional(),
  startsAtLocal: z.string().trim().max(8).nullable().optional(),
  endsAtLocal: z.string().trim().max(8).nullable().optional(),
  isActive: z.boolean().default(true),
  templateSlugs: z.string().trim().min(1).max(1000),
});

export const reportBundleRequestSchema = z.object({
  view: reportViewSchema,
  windowType: z.enum(metricWindowValues),
  anchorDate: z.string().date(),
  formats: z.array(reportExportFormatSchema).min(1).max(4),
  datasets: z.array(reportDatasetSchema).min(1).max(3),
  scopeKey: z.string().trim().min(1).max(128).nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
});

export function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
