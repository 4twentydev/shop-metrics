export const metricWindowValues = ["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"] as const;
export const metricScopeValues = [
  "EMPLOYEE",
  "DEPARTMENT",
  "JOB",
  "RELEASE",
  "COMPANY",
  "PART_FAMILY",
] as const;
export const reworkSourceValues = [
  "UNKNOWN",
  "INTERNAL_FAULT",
  "INSTALLER_FAULT",
] as const;

export type MetricWindow = (typeof metricWindowValues)[number];
export type MetricScope = (typeof metricScopeValues)[number];
export type ReworkSource = (typeof reworkSourceValues)[number];

export type MetricWindowRange = {
  windowType: MetricWindow;
  windowStart: string;
  windowEnd: string;
};

export type MetricScopeDescriptor = {
  scopeType: MetricScope;
  scopeReferenceId: string | null;
  scopeKey: string | null;
  label: string;
};

export type MetricSourceRow = {
  workEntryId: string;
  submissionId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  jobId: string;
  jobNumber: string;
  releaseId: string;
  releaseCode: string;
  partFamily: string | null;
  businessDate: string;
  nativeUnitType: string;
  nativeQuantity: number;
  panelEquivalentQuantity: number;
  panelsPerNativeUnit: number | null;
  expectedNativeUnitType: string;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "CHANGES_REQUESTED";
  isLocked: boolean;
  versionCount: number;
  wasEdited: boolean;
  isRework: boolean;
  reworkSource: ReworkSource;
  faultDepartmentCode: string | null;
  fixingDepartmentCode: string | null;
  releaseExpectedPanels: number | null;
  releaseIsStale: boolean;
  submissionReopenCount: number;
};

export type MetricTargetInput = {
  id: string;
  windowType: MetricWindow;
  scopeType: MetricScope;
  scopeReferenceId: string | null;
  scopeKey: string | null;
  metricKey: string;
  targetValue: number;
  unitLabel: string;
  effectiveStart: string;
  effectiveEnd: string | null;
  notes: string | null;
  deletedAt?: Date | null;
  deletionReason?: string | null;
};

export type TargetAttainment = {
  metricKey: string;
  targetValue: number;
  actualValue: number | null;
  variance: number | null;
  attainmentPercent: number | null;
  unitLabel: string;
  notes: string | null;
};

export type MetricSnapshotPayload = {
  output: {
    entryCount: number;
    nativeQuantityTotal: number;
    panelEquivalentTotal: number;
    verifiedPanelEquivalentTotal: number;
    unverifiedPanelEquivalentTotal: number;
    nonReworkPanelEquivalentTotal: number;
  };
  completion: {
    expectedPanels: number;
    completedPanels: number;
    completionPercent: number | null;
    partFamilyCompletionPercentages: Record<string, number | null>;
  };
  rework: {
    reworkEntryCount: number;
    reworkPanelEquivalentTotal: number;
    internalFaultRemakePanels: number;
    installerFaultRemakePanels: number;
    faultZonePanels: Record<string, number>;
    fixingZonePanels: Record<string, number>;
  };
  accountability: {
    editedEntryCount: number;
    unverifiedEntryCount: number;
    lockedEntryCount: number;
    reopenEventCount: number;
    missingMappingCount: number;
    staleBaselineReleaseCount: number;
    staleBaselinePanelImpact: number;
  };
};

export type MetricSnapshotTargetSummary = {
  activeTargetCount: number;
  targets: TargetAttainment[];
};

export type MetricSnapshotSourceSummary = {
  rowCount: number;
  submissionCount: number;
  releaseCount: number;
  staleReleaseCount: number;
  generatedFromBusinessDates: string[];
};

export type MetricSnapshotRecord = MetricScopeDescriptor &
  MetricWindowRange & {
    metrics: MetricSnapshotPayload;
    targetSummary: MetricSnapshotTargetSummary;
    sourceSummary: MetricSnapshotSourceSummary;
  };
