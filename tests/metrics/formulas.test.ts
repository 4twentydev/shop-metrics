import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateAttainmentPercentage,
  calculateCompletionPercentage,
  toPanelEquivalent,
} from "../../features/metrics/formulas";
import { buildMetricSnapshots, calculateSnapshotPayload } from "../../features/metrics/engine";

test("toPanelEquivalent normalizes native units into panel-equivalent output", () => {
  assert.equal(toPanelEquivalent(12, 0.75), 9);
});

test("calculateCompletionPercentage returns null when no baseline exists", () => {
  assert.equal(calculateCompletionPercentage(10, 0), null);
});

test("calculateAttainmentPercentage reports progress against manual targets", () => {
  assert.equal(calculateAttainmentPercentage(84, 70), 120);
});

test("calculateSnapshotPayload separates rework, accountability, and stale baseline impact", () => {
  const payload = calculateSnapshotPayload([
    {
      workEntryId: "we-1",
      submissionId: "sub-1",
      employeeId: "emp-1",
      employeeCode: "ELW-1",
      employeeName: "Jordan Patel",
      departmentId: "dep-panel",
      departmentCode: "PNL",
      departmentName: "Panel Prep",
      jobId: "job-1",
      jobNumber: "24031",
      releaseId: "rel-1",
      releaseCode: "R1",
      partFamily: "DISCONNECT",
      businessDate: "2026-03-29",
      nativeUnitType: "panels",
      nativeQuantity: 40,
      panelEquivalentQuantity: 40,
      panelsPerNativeUnit: 1,
      expectedNativeUnitType: "panels",
      verificationStatus: "VERIFIED",
      isLocked: false,
      versionCount: 1,
      wasEdited: false,
      isRework: false,
      reworkSource: "UNKNOWN",
      faultDepartmentCode: null,
      fixingDepartmentCode: null,
      releaseExpectedPanels: 100,
      releaseIsStale: false,
      submissionReopenCount: 0,
    },
    {
      workEntryId: "we-2",
      submissionId: "sub-2",
      employeeId: "emp-2",
      employeeCode: "ELW-2",
      employeeName: "Riley Gomez",
      departmentId: "dep-cnc",
      departmentCode: "CNC",
      departmentName: "CNC",
      jobId: "job-1",
      jobNumber: "24031",
      releaseId: "rel-1",
      releaseCode: "R1",
      partFamily: "DISCONNECT",
      businessDate: "2026-03-29",
      nativeUnitType: "sheets",
      nativeQuantity: 4,
      panelEquivalentQuantity: 4,
      panelsPerNativeUnit: 1,
      expectedNativeUnitType: "sheets",
      verificationStatus: "UNVERIFIED",
      isLocked: true,
      versionCount: 2,
      wasEdited: true,
      isRework: true,
      reworkSource: "INTERNAL_FAULT",
      faultDepartmentCode: "CNC",
      fixingDepartmentCode: "PNL",
      releaseExpectedPanels: 100,
      releaseIsStale: true,
      submissionReopenCount: 2,
    },
    {
      workEntryId: "we-3",
      submissionId: "sub-3",
      employeeId: "emp-3",
      employeeCode: "ELW-3",
      employeeName: "Sam Lee",
      departmentId: "dep-asm",
      departmentCode: "ASM",
      departmentName: "Assembly",
      jobId: "job-2",
      jobNumber: "24032",
      releaseId: "rel-2",
      releaseCode: "RMK1",
      partFamily: "METERING",
      businessDate: "2026-03-29",
      nativeUnitType: "assemblies",
      nativeQuantity: 3,
      panelEquivalentQuantity: 3,
      panelsPerNativeUnit: 1,
      expectedNativeUnitType: "assemblies",
      verificationStatus: "VERIFIED",
      isLocked: false,
      versionCount: 1,
      wasEdited: false,
      isRework: true,
      reworkSource: "INSTALLER_FAULT",
      faultDepartmentCode: "FIELD",
      fixingDepartmentCode: "ASM",
      releaseExpectedPanels: 50,
      releaseIsStale: false,
      submissionReopenCount: 0,
    },
  ]);

  assert.deepEqual(payload.metrics.output, {
    entryCount: 3,
    nativeQuantityTotal: 47,
    panelEquivalentTotal: 47,
    verifiedPanelEquivalentTotal: 43,
    unverifiedPanelEquivalentTotal: 4,
    nonReworkPanelEquivalentTotal: 40,
  });
  assert.equal(payload.metrics.completion.expectedPanels, 150);
  assert.equal(payload.metrics.completion.completionPercent, 26.67);
  assert.equal(payload.metrics.completion.partFamilyCompletionPercentages.DISCONNECT, 40);
  assert.equal(payload.metrics.rework.internalFaultRemakePanels, 4);
  assert.equal(payload.metrics.rework.installerFaultRemakePanels, 3);
  assert.equal(payload.metrics.accountability.editedEntryCount, 1);
  assert.equal(payload.metrics.accountability.unverifiedEntryCount, 1);
  assert.equal(payload.metrics.accountability.reopenEventCount, 2);
  assert.equal(payload.metrics.accountability.staleBaselinePanelImpact, 100);
});

test("buildMetricSnapshots produces company and scoped snapshots with targets", () => {
  const snapshots = buildMetricSnapshots({
    range: {
      windowType: "DAILY",
      windowStart: "2026-03-29",
      windowEnd: "2026-03-29",
    },
    rows: [
      {
        workEntryId: "we-1",
        submissionId: "sub-1",
        employeeId: "emp-1",
        employeeCode: "ELW-1",
        employeeName: "Jordan Patel",
        departmentId: "dep-panel",
        departmentCode: "PNL",
        departmentName: "Panel Prep",
        jobId: "job-1",
        jobNumber: "24031",
        releaseId: "rel-1",
        releaseCode: "R1",
        partFamily: "DISCONNECT",
        businessDate: "2026-03-29",
        nativeUnitType: "panels",
        nativeQuantity: 42,
        panelEquivalentQuantity: 42,
        panelsPerNativeUnit: 1,
        expectedNativeUnitType: "panels",
        verificationStatus: "VERIFIED",
        isLocked: false,
        versionCount: 1,
        wasEdited: false,
        isRework: false,
        reworkSource: "UNKNOWN",
        faultDepartmentCode: null,
        fixingDepartmentCode: null,
        releaseExpectedPanels: 84,
        releaseIsStale: false,
        submissionReopenCount: 0,
      },
    ],
    targets: [
      {
        id: "target-1",
        windowType: "DAILY",
        scopeType: "COMPANY",
        scopeReferenceId: null,
        scopeKey: "ELWARD_SYSTEMS",
        metricKey: "panel_output",
        targetValue: 70,
        unitLabel: "panels",
        effectiveStart: "2026-03-01",
        effectiveEnd: null,
        notes: "Daily company output target.",
      },
    ],
  });

  const companySnapshot = snapshots.find(
    (snapshot) => snapshot.scopeType === "COMPANY",
  );

  assert.ok(companySnapshot);
  assert.equal(companySnapshot?.metrics.completion.completionPercent, 50);
  assert.equal(companySnapshot?.targetSummary.activeTargetCount, 1);
  assert.equal(companySnapshot?.targetSummary.targets[0]?.variance, -28);
});
