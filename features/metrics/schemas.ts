import { z } from "zod";

import {
  metricScopeValues,
  metricWindowValues,
  reworkSourceValues,
} from "./types";

const numericRecordSchema = z.record(z.string(), z.number());

export const metricWindowSchema = z.enum(metricWindowValues);
export const metricScopeSchema = z.enum(metricScopeValues);
export const reworkSourceSchema = z.enum(reworkSourceValues);

export const metricSnapshotPayloadSchema = z
  .object({
    output: z
      .object({
        entryCount: z.number().int().nonnegative(),
        nativeQuantityTotal: z.number().nonnegative(),
        panelEquivalentTotal: z.number().nonnegative(),
        verifiedPanelEquivalentTotal: z.number().nonnegative(),
        unverifiedPanelEquivalentTotal: z.number().nonnegative(),
        nonReworkPanelEquivalentTotal: z.number().nonnegative(),
      })
      .strict(),
    completion: z
      .object({
        expectedPanels: z.number().nonnegative(),
        completedPanels: z.number().nonnegative(),
        completionPercent: z.number().min(0).max(100).nullable(),
        partFamilyCompletionPercentages: z.record(
          z.string(),
          z.number().min(0).max(100).nullable(),
        ),
      })
      .strict(),
    rework: z
      .object({
        reworkEntryCount: z.number().int().nonnegative(),
        reworkPanelEquivalentTotal: z.number().nonnegative(),
        internalFaultRemakePanels: z.number().nonnegative(),
        installerFaultRemakePanels: z.number().nonnegative(),
        faultZonePanels: numericRecordSchema,
        fixingZonePanels: numericRecordSchema,
      })
      .strict(),
    accountability: z
      .object({
        editedEntryCount: z.number().int().nonnegative(),
        unverifiedEntryCount: z.number().int().nonnegative(),
        lockedEntryCount: z.number().int().nonnegative(),
        reopenEventCount: z.number().int().nonnegative(),
        missingMappingCount: z.number().int().nonnegative(),
        staleBaselineReleaseCount: z.number().int().nonnegative(),
        staleBaselinePanelImpact: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const targetAttainmentSchema = z
  .object({
    metricKey: z.string().min(1).max(96),
    targetValue: z.number(),
    actualValue: z.number().nullable(),
    variance: z.number().nullable(),
    attainmentPercent: z.number().min(0).nullable(),
    unitLabel: z.string().min(1).max(48),
    notes: z.string().nullable(),
  })
  .strict();

export const metricSnapshotTargetSummarySchema = z
  .object({
    activeTargetCount: z.number().int().nonnegative(),
    targets: z.array(targetAttainmentSchema),
  })
  .strict();

export const metricSnapshotSourceSummarySchema = z
  .object({
    rowCount: z.number().int().nonnegative(),
    submissionCount: z.number().int().nonnegative(),
    releaseCount: z.number().int().nonnegative(),
    staleReleaseCount: z.number().int().nonnegative(),
    generatedFromBusinessDates: z.array(z.string()),
  })
  .strict();

export const metricSnapshotRecordSchema = z
  .object({
    windowType: metricWindowSchema,
    windowStart: z.string().date(),
    windowEnd: z.string().date(),
    scopeType: metricScopeSchema,
    scopeReferenceId: z.string().uuid().nullable(),
    scopeKey: z.string().nullable(),
    label: z.string().min(1).max(160),
    metrics: metricSnapshotPayloadSchema,
    targetSummary: metricSnapshotTargetSummarySchema,
    sourceSummary: metricSnapshotSourceSummarySchema,
  })
  .strict();
