import "server-only";

import {
  alias,
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  departments,
  employees,
  jobReleases,
  jobs,
  metricSnapshots,
  metricTargets,
  shiftSubmissions,
  workEntries,
} from "@/lib/db/schema";

import { metricSnapshotRecordSchema } from "./schemas";
import type {
  MetricScope,
  MetricTargetInput,
  MetricWindowRange,
  MetricSourceRow,
} from "./types";

const faultDepartments = alias(departments, "fault_departments");
const fixingDepartments = alias(departments, "fixing_departments");

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

export async function loadMetricSourceRows(
  range: Pick<MetricWindowRange, "windowStart" | "windowEnd">,
) {
  const rows = await db
    .select({
      workEntryId: workEntries.id,
      submissionId: workEntries.submissionId,
      employeeId: employees.id,
      employeeCode: employees.employeeCode,
      employeeName: employees.displayName,
      departmentId: departments.id,
      departmentCode: departments.code,
      departmentName: departments.name,
      jobId: jobs.id,
      jobNumber: jobs.jobNumber,
      releaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      partFamily: jobReleases.partFamily,
      businessDate: workEntries.businessDate,
      nativeUnitType: workEntries.nativeUnitType,
      nativeQuantity: workEntries.nativeQuantity,
      panelEquivalentQuantity: workEntries.panelEquivalentQuantity,
      panelsPerNativeUnit: departments.panelsPerNativeUnit,
      expectedNativeUnitType: departments.nativeUnitLabel,
      verificationStatus: workEntries.verificationStatus,
      isLocked: workEntries.isLocked,
      versionCount: workEntries.versionCount,
      editedAt: workEntries.editedAt,
      isRework: workEntries.isRework,
      reworkSource: workEntries.reworkSource,
      faultDepartmentCode: faultDepartments.code,
      fixingDepartmentCode: fixingDepartments.code,
      releaseExpectedPanels: jobReleases.panelBaseline,
      releaseIsStale: jobReleases.baselineStaleAt,
      submissionReopenCount: shiftSubmissions.reopenCount,
    })
    .from(workEntries)
    .innerJoin(
      shiftSubmissions,
      eq(workEntries.submissionId, shiftSubmissions.id),
    )
    .innerJoin(employees, eq(shiftSubmissions.employeeId, employees.id))
    .innerJoin(departments, eq(workEntries.departmentId, departments.id))
    .innerJoin(jobReleases, eq(workEntries.jobReleaseId, jobReleases.id))
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .leftJoin(
      faultDepartments,
      eq(workEntries.faultDepartmentId, faultDepartments.id),
    )
    .leftJoin(
      fixingDepartments,
      eq(workEntries.fixingDepartmentId, fixingDepartments.id),
    )
    .where(
      and(
        gte(workEntries.businessDate, range.windowStart),
        lte(workEntries.businessDate, range.windowEnd),
      ),
    )
    .orderBy(workEntries.businessDate, jobs.jobNumber, jobReleases.releaseCode);

  return rows.map(
    (row): MetricSourceRow => ({
      workEntryId: row.workEntryId,
      submissionId: row.submissionId,
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      releaseId: row.releaseId,
      releaseCode: row.releaseCode,
      partFamily: row.partFamily,
      businessDate: row.businessDate,
      nativeUnitType: row.nativeUnitType,
      nativeQuantity: toNumber(row.nativeQuantity) ?? 0,
      panelEquivalentQuantity: toNumber(row.panelEquivalentQuantity) ?? 0,
      panelsPerNativeUnit: toNumber(row.panelsPerNativeUnit),
      expectedNativeUnitType: row.expectedNativeUnitType,
      verificationStatus: row.verificationStatus,
      isLocked: row.isLocked,
      versionCount: row.versionCount,
      wasEdited: Boolean(row.editedAt),
      isRework: row.isRework,
      reworkSource: row.reworkSource,
      faultDepartmentCode: row.faultDepartmentCode,
      fixingDepartmentCode: row.fixingDepartmentCode,
      releaseExpectedPanels: toNumber(row.releaseExpectedPanels),
      releaseIsStale: Boolean(row.releaseIsStale),
      submissionReopenCount: row.submissionReopenCount,
    }),
  );
}

export async function loadMetricTargets(range: MetricWindowRange) {
  const rows = await db
    .select({
      id: metricTargets.id,
      windowType: metricTargets.windowType,
      scopeType: metricTargets.scopeType,
      scopeReferenceId: metricTargets.scopeReferenceId,
      scopeKey: metricTargets.scopeKey,
      metricKey: metricTargets.metricKey,
      targetValue: metricTargets.targetValue,
      unitLabel: metricTargets.unitLabel,
      effectiveStart: metricTargets.effectiveStart,
      effectiveEnd: metricTargets.effectiveEnd,
      notes: metricTargets.notes,
    })
    .from(metricTargets)
    .where(
      and(
        eq(metricTargets.windowType, range.windowType),
        isNull(metricTargets.deletedAt),
        lte(metricTargets.effectiveStart, range.windowEnd),
        or(
          isNull(metricTargets.effectiveEnd),
          gte(metricTargets.effectiveEnd, range.windowStart),
        ),
      ),
    )
    .orderBy(metricTargets.scopeType, metricTargets.metricKey);

  return rows.map(
    (row): MetricTargetInput => ({
      id: row.id,
      windowType: row.windowType,
      scopeType: row.scopeType,
      scopeReferenceId: row.scopeReferenceId,
      scopeKey: row.scopeKey,
      metricKey: row.metricKey,
      targetValue: toNumber(row.targetValue) ?? 0,
      unitLabel: row.unitLabel,
      effectiveStart: row.effectiveStart,
      effectiveEnd: row.effectiveEnd,
      notes: row.notes,
    }),
  );
}

export async function getMetricTargetAdminList(input?: {
  includeDeleted?: boolean;
  deletedOnly?: boolean;
}) {
  const visibilityFilter = input?.deletedOnly
    ? sql`${metricTargets.deletedAt} is not null`
    : input?.includeDeleted
      ? sql`true`
      : sql`${metricTargets.deletedAt} is null`;

  const rows = await db
    .select({
      id: metricTargets.id,
      windowType: metricTargets.windowType,
      scopeType: metricTargets.scopeType,
      scopeReferenceId: metricTargets.scopeReferenceId,
      scopeKey: metricTargets.scopeKey,
      metricKey: metricTargets.metricKey,
      targetValue: metricTargets.targetValue,
      unitLabel: metricTargets.unitLabel,
      effectiveStart: metricTargets.effectiveStart,
      effectiveEnd: metricTargets.effectiveEnd,
      notes: metricTargets.notes,
      deletedAt: metricTargets.deletedAt,
      deletionReason: metricTargets.deletionReason,
    })
    .from(metricTargets)
    .where(visibilityFilter)
    .orderBy(
      metricTargets.windowType,
      metricTargets.scopeType,
      metricTargets.scopeKey,
      metricTargets.metricKey,
    );

  return rows.map(
    (row): MetricTargetInput => ({
      id: row.id,
      windowType: row.windowType,
      scopeType: row.scopeType,
      scopeReferenceId: row.scopeReferenceId,
      scopeKey: row.scopeKey,
      metricKey: row.metricKey,
      targetValue: toNumber(row.targetValue) ?? 0,
      unitLabel: row.unitLabel,
      effectiveStart: row.effectiveStart,
      effectiveEnd: row.effectiveEnd,
      notes: row.notes,
      deletedAt: row.deletedAt,
      deletionReason: row.deletionReason,
    }),
  );
}

export async function getLatestCompanySnapshot(
  windowType: MetricWindowRange["windowType"],
  windowStart: string,
) {
  const [snapshot] = await db
    .select({
      windowType: metricSnapshots.windowType,
      windowStart: metricSnapshots.windowStart,
      windowEnd: metricSnapshots.windowEnd,
      scopeType: metricSnapshots.scopeType,
      scopeReferenceId: metricSnapshots.scopeReferenceId,
      scopeKey: metricSnapshots.scopeKey,
      metrics: metricSnapshots.metrics,
      targetSummary: metricSnapshots.targetSummary,
      sourceSummary: metricSnapshots.sourceSummary,
    })
    .from(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.windowType, windowType),
        eq(metricSnapshots.windowStart, windowStart),
        eq(metricSnapshots.scopeType, "COMPANY"),
        eq(metricSnapshots.scopeKey, "ELWARD_SYSTEMS"),
      ),
    )
    .orderBy(desc(metricSnapshots.capturedAt))
    .limit(1);

  if (!snapshot) {
    return null;
  }

  return metricSnapshotRecordSchema.parse({
    windowType: snapshot.windowType,
    windowStart: snapshot.windowStart,
    windowEnd: snapshot.windowEnd,
    scopeType: snapshot.scopeType,
    scopeReferenceId: snapshot.scopeReferenceId,
    scopeKey: snapshot.scopeKey,
    label: "Elward Systems",
    metrics: snapshot.metrics,
    targetSummary: snapshot.targetSummary,
    sourceSummary: snapshot.sourceSummary,
  });
}

export async function getLatestScopeSnapshots(input: {
  windowType: MetricWindowRange["windowType"];
  windowStart: string;
  scopeType: Exclude<MetricScope, "COMPANY">;
}) {
  const rows = await db
    .select({
      id: metricSnapshots.id,
      capturedAt: metricSnapshots.capturedAt,
      windowType: metricSnapshots.windowType,
      windowStart: metricSnapshots.windowStart,
      windowEnd: metricSnapshots.windowEnd,
      scopeType: metricSnapshots.scopeType,
      scopeReferenceId: metricSnapshots.scopeReferenceId,
      scopeKey: metricSnapshots.scopeKey,
      metrics: metricSnapshots.metrics,
      targetSummary: metricSnapshots.targetSummary,
      sourceSummary: metricSnapshots.sourceSummary,
    })
    .from(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.windowType, input.windowType),
        eq(metricSnapshots.windowStart, input.windowStart),
        eq(metricSnapshots.scopeType, input.scopeType),
      ),
    )
    .orderBy(desc(metricSnapshots.capturedAt));

  const latestByScope = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    const key = `${row.scopeReferenceId ?? "none"}:${row.scopeKey ?? "none"}`;
    if (!latestByScope.has(key)) {
      latestByScope.set(key, row);
    }
  }

  return Array.from(latestByScope.values()).map((row) =>
    metricSnapshotRecordSchema.parse({
      windowType: row.windowType,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
      scopeType: row.scopeType,
      scopeReferenceId: row.scopeReferenceId,
      scopeKey: row.scopeKey,
      label: row.scopeKey ?? row.scopeReferenceId ?? row.id,
      metrics: row.metrics,
      targetSummary: row.targetSummary,
      sourceSummary: row.sourceSummary,
    }),
  );
}

export async function getReleaseCompletionSnapshots(
  releaseIds: string[],
  range: MetricWindowRange,
) {
  if (releaseIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      scopeReferenceId: metricSnapshots.scopeReferenceId,
      scopeKey: metricSnapshots.scopeKey,
      metrics: metricSnapshots.metrics,
      targetSummary: metricSnapshots.targetSummary,
      sourceSummary: metricSnapshots.sourceSummary,
      capturedAt: metricSnapshots.capturedAt,
    })
    .from(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.windowType, range.windowType),
        eq(metricSnapshots.windowStart, range.windowStart),
        eq(metricSnapshots.scopeType, "RELEASE"),
        inArray(metricSnapshots.scopeReferenceId, releaseIds),
      ),
    )
    .orderBy(desc(metricSnapshots.capturedAt));

  return rows.map((row) => ({
    releaseId: row.scopeReferenceId,
    releaseCode: row.scopeKey,
    completionPercent:
      metricSnapshotRecordSchema.parse({
        windowType: range.windowType,
        windowStart: range.windowStart,
        windowEnd: range.windowEnd,
        scopeType: "RELEASE",
        scopeReferenceId: row.scopeReferenceId,
        scopeKey: row.scopeKey,
        label: row.scopeKey ?? row.scopeReferenceId ?? "release",
        metrics: row.metrics,
        targetSummary: row.targetSummary,
        sourceSummary: row.sourceSummary,
      }).metrics.completion.completionPercent,
  }));
}
