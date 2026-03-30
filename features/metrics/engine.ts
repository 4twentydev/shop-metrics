import { metricSnapshotRecordSchema } from "./schemas";
import {
  calculateAttainmentPercentage,
  calculateCompletionPercentage,
  calculateVariance,
  roundMetric,
  sumMetric,
} from "./formulas";
import type {
  MetricScope,
  MetricScopeDescriptor,
  MetricSnapshotPayload,
  MetricSnapshotRecord,
  MetricTargetInput,
  MetricWindowRange,
  MetricSourceRow,
  TargetAttainment,
} from "./types";

type ScopeAccumulator = {
  scope: MetricScopeDescriptor;
  rows: MetricSourceRow[];
};

function buildScopeDescriptor(
  scopeType: MetricScope,
  row: MetricSourceRow,
): MetricScopeDescriptor | null {
  if (scopeType === "COMPANY") {
    return {
      scopeType,
      scopeReferenceId: null,
      scopeKey: "ELWARD_SYSTEMS",
      label: "Elward Systems",
    };
  }

  if (scopeType === "EMPLOYEE") {
    return {
      scopeType,
      scopeReferenceId: row.employeeId,
      scopeKey: row.employeeCode,
      label: row.employeeName,
    };
  }

  if (scopeType === "DEPARTMENT") {
    return {
      scopeType,
      scopeReferenceId: row.departmentId,
      scopeKey: row.departmentCode,
      label: row.departmentName,
    };
  }

  if (scopeType === "JOB") {
    return {
      scopeType,
      scopeReferenceId: row.jobId,
      scopeKey: row.jobNumber,
      label: row.jobNumber,
    };
  }

  if (scopeType === "RELEASE") {
    return {
      scopeType,
      scopeReferenceId: row.releaseId,
      scopeKey: row.releaseCode,
      label: `${row.jobNumber}-${row.releaseCode}`,
    };
  }

  if (!row.partFamily) {
    return null;
  }

  return {
    scopeType,
    scopeReferenceId: null,
    scopeKey: row.partFamily,
    label: row.partFamily,
  };
}

function scopeKey(scope: MetricScopeDescriptor) {
  return `${scope.scopeType}:${scope.scopeReferenceId ?? "none"}:${scope.scopeKey ?? "none"}`;
}

function addToRecord(
  record: Record<string, number>,
  key: string | null,
  value: number,
) {
  if (!key) {
    return;
  }

  record[key] = roundMetric((record[key] ?? 0) + value);
}

function extractActualValue(
  metricKey: string,
  metrics: MetricSnapshotPayload,
) {
  switch (metricKey) {
    case "panel_output":
      return metrics.output.nonReworkPanelEquivalentTotal;
    case "verified_panel_output":
      return metrics.output.verifiedPanelEquivalentTotal;
    case "rework_panel_output":
      return metrics.rework.reworkPanelEquivalentTotal;
    case "completion_percentage":
      return metrics.completion.completionPercent;
    case "stale_baseline_panel_impact":
      return metrics.accountability.staleBaselinePanelImpact;
    default:
      return null;
  }
}

function buildTargetSummary(
  scope: MetricScopeDescriptor,
  targets: MetricTargetInput[],
  metrics: MetricSnapshotPayload,
) {
  const relevantTargets = targets.filter(
    (target) =>
      target.scopeType === scope.scopeType &&
      target.scopeReferenceId === scope.scopeReferenceId &&
      target.scopeKey === scope.scopeKey,
  );

  const targetSummaries: TargetAttainment[] = relevantTargets.map((target) => {
    const actualValue = extractActualValue(target.metricKey, metrics);

    return {
      metricKey: target.metricKey,
      targetValue: target.targetValue,
      actualValue,
      variance:
        actualValue === null
          ? null
          : calculateVariance(actualValue, target.targetValue),
      attainmentPercent:
        actualValue === null
          ? null
          : calculateAttainmentPercentage(actualValue, target.targetValue),
      unitLabel: target.unitLabel,
      notes: target.notes,
    };
  });

  return {
    activeTargetCount: targetSummaries.length,
    targets: targetSummaries,
  };
}

export function calculateSnapshotPayload(rows: MetricSourceRow[]) {
  const releaseExpectedPanels = new Map<
    string,
    { expectedPanels: number; isStale: boolean; partFamily: string | null }
  >();
  const touchedReleaseIds = new Set<string>();
  const touchedStaleReleaseIds = new Set<string>();
  const reopenCounts = new Map<string, number>();
  const partFamilyCompleted = new Map<string, number>();
  const partFamilyExpected = new Map<string, number>();
  const faultZonePanels: Record<string, number> = {};
  const fixingZonePanels: Record<string, number> = {};

  let nativeQuantityTotal = 0;
  let panelEquivalentTotal = 0;
  let verifiedPanelEquivalentTotal = 0;
  let unverifiedPanelEquivalentTotal = 0;
  let nonReworkPanelEquivalentTotal = 0;
  let editedEntryCount = 0;
  let unverifiedEntryCount = 0;
  let lockedEntryCount = 0;
  let missingMappingCount = 0;
  let reworkEntryCount = 0;
  let reworkPanelEquivalentTotal = 0;
  let internalFaultRemakePanels = 0;
  let installerFaultRemakePanels = 0;

  for (const row of rows) {
    touchedReleaseIds.add(row.releaseId);

    if (row.releaseIsStale) {
      touchedStaleReleaseIds.add(row.releaseId);
    }

    nativeQuantityTotal += row.nativeQuantity;
    panelEquivalentTotal += row.panelEquivalentQuantity;

    if (row.verificationStatus === "VERIFIED") {
      verifiedPanelEquivalentTotal += row.panelEquivalentQuantity;
    } else {
      unverifiedEntryCount += 1;
      unverifiedPanelEquivalentTotal += row.panelEquivalentQuantity;
    }

    if (!row.isRework) {
      nonReworkPanelEquivalentTotal += row.panelEquivalentQuantity;
      if (row.partFamily) {
        partFamilyCompleted.set(
          row.partFamily,
          roundMetric(
            (partFamilyCompleted.get(row.partFamily) ?? 0) +
              row.panelEquivalentQuantity,
          ),
        );
      }
    } else {
      reworkEntryCount += 1;
      reworkPanelEquivalentTotal += row.panelEquivalentQuantity;
      addToRecord(faultZonePanels, row.faultDepartmentCode, row.panelEquivalentQuantity);
      addToRecord(fixingZonePanels, row.fixingDepartmentCode, row.panelEquivalentQuantity);

      if (row.reworkSource === "INTERNAL_FAULT") {
        internalFaultRemakePanels += row.panelEquivalentQuantity;
      }

      if (row.reworkSource === "INSTALLER_FAULT") {
        installerFaultRemakePanels += row.panelEquivalentQuantity;
      }
    }

    if (row.wasEdited) {
      editedEntryCount += 1;
    }

    if (row.isLocked) {
      lockedEntryCount += 1;
    }

    if (
      row.panelsPerNativeUnit === null ||
      row.panelsPerNativeUnit <= 0 ||
      row.nativeUnitType !== row.expectedNativeUnitType
    ) {
      missingMappingCount += 1;
    }

    if (!reopenCounts.has(row.submissionId)) {
      reopenCounts.set(row.submissionId, row.submissionReopenCount);
    }

    if (
      !releaseExpectedPanels.has(row.releaseId) &&
      row.releaseExpectedPanels !== null
    ) {
      releaseExpectedPanels.set(row.releaseId, {
        expectedPanels: row.releaseExpectedPanels,
        isStale: row.releaseIsStale,
        partFamily: row.partFamily,
      });
    }
  }

  for (const release of releaseExpectedPanels.values()) {
    if (!release.partFamily) {
      continue;
    }

    partFamilyExpected.set(
      release.partFamily,
      roundMetric(
        (partFamilyExpected.get(release.partFamily) ?? 0) + release.expectedPanels,
      ),
    );
  }

  const expectedPanels = sumMetric(
    Array.from(releaseExpectedPanels.values()).map((release) => release.expectedPanels),
  );
  const staleReleases = Array.from(releaseExpectedPanels.values()).filter(
    (release) => release.isStale,
  );
  const staleBaselinePanelImpact = sumMetric(
    staleReleases.map((release) => release.expectedPanels),
  );

  const partFamilyCompletionPercentages = Object.fromEntries(
    Array.from(
      new Set([
        ...Array.from(partFamilyExpected.keys()),
        ...Array.from(partFamilyCompleted.keys()),
      ]),
    ).map((partFamily) => [
      partFamily,
      calculateCompletionPercentage(
        partFamilyCompleted.get(partFamily) ?? 0,
        partFamilyExpected.get(partFamily) ?? 0,
      ),
    ]),
  );

  return {
    metrics: {
      output: {
        entryCount: rows.length,
        nativeQuantityTotal: roundMetric(nativeQuantityTotal),
        panelEquivalentTotal: roundMetric(panelEquivalentTotal),
        verifiedPanelEquivalentTotal: roundMetric(verifiedPanelEquivalentTotal),
        unverifiedPanelEquivalentTotal: roundMetric(unverifiedPanelEquivalentTotal),
        nonReworkPanelEquivalentTotal: roundMetric(nonReworkPanelEquivalentTotal),
      },
      completion: {
        expectedPanels,
        completedPanels: roundMetric(nonReworkPanelEquivalentTotal),
        completionPercent: calculateCompletionPercentage(
          nonReworkPanelEquivalentTotal,
          expectedPanels,
        ),
        partFamilyCompletionPercentages,
      },
      rework: {
        reworkEntryCount,
        reworkPanelEquivalentTotal: roundMetric(reworkPanelEquivalentTotal),
        internalFaultRemakePanels: roundMetric(internalFaultRemakePanels),
        installerFaultRemakePanels: roundMetric(installerFaultRemakePanels),
        faultZonePanels,
        fixingZonePanels,
      },
      accountability: {
        editedEntryCount,
        unverifiedEntryCount,
        lockedEntryCount,
        reopenEventCount: Array.from(reopenCounts.values()).reduce(
          (total, count) => total + count,
          0,
        ),
        missingMappingCount,
        staleBaselineReleaseCount: staleReleases.length,
        staleBaselinePanelImpact,
      },
    },
    sourceSummary: {
      rowCount: rows.length,
      submissionCount: reopenCounts.size,
      releaseCount: touchedReleaseIds.size,
      staleReleaseCount: touchedStaleReleaseIds.size,
      generatedFromBusinessDates: Array.from(
        new Set(rows.map((row) => row.businessDate)),
      ).sort(),
    },
  };
}

function buildScopeAccumulators(rows: MetricSourceRow[]) {
  const scopes: MetricScope[] = [
    "COMPANY",
    "EMPLOYEE",
    "DEPARTMENT",
    "JOB",
    "RELEASE",
    "PART_FAMILY",
  ];
  const grouped = new Map<string, ScopeAccumulator>();

  for (const row of rows) {
    for (const scopeType of scopes) {
      const scope = buildScopeDescriptor(scopeType, row);

      if (!scope) {
        continue;
      }

      const key = scopeKey(scope);
      const accumulator = grouped.get(key);

      if (accumulator) {
        accumulator.rows.push(row);
        continue;
      }

      grouped.set(key, {
        scope,
        rows: [row],
      });
    }
  }

  return Array.from(grouped.values());
}

export function buildMetricSnapshots(input: {
  rows: MetricSourceRow[];
  targets: MetricTargetInput[];
  range: MetricWindowRange;
}) {
  const snapshots: MetricSnapshotRecord[] = [];

  for (const group of buildScopeAccumulators(input.rows)) {
    const { metrics, sourceSummary } = calculateSnapshotPayload(group.rows);
    const targetSummary = buildTargetSummary(group.scope, input.targets, metrics);

    snapshots.push(
      metricSnapshotRecordSchema.parse({
        ...input.range,
        ...group.scope,
        label: group.scope.label,
        metrics,
        targetSummary,
        sourceSummary,
      }),
    );
  }

  return snapshots;
}
