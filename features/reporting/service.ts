import "server-only";

import { buildMetricSnapshots } from "@/features/metrics/engine";
import { loadMetricSourceRows, loadMetricTargets } from "@/features/metrics/queries";
import { getMetricWindowRange } from "@/features/metrics/windows";
import { formatNumber, formatPercent } from "@/lib/utils";

import { getReportTemplateById, getSavedReportTemplates } from "./queries";
import { reportFilterSchema } from "./schemas";
import type {
  PivotExportRow,
  ReportFilterInput,
  ReportLink,
  ReportRawRow,
  ReportSummaryCard,
  ReportTabularSection,
  ReportViewModel,
  SavedReportTemplate,
} from "./types";

type SnapshotMap = Record<string, ReturnType<typeof buildMetricSnapshots>[number]>;

function snapshotKey(scopeType: string, scopeKey: string | null, scopeReferenceId: string | null) {
  return `${scopeType}:${scopeReferenceId ?? "none"}:${scopeKey ?? "none"}`;
}

function buildSnapshotMap(snapshots: ReturnType<typeof buildMetricSnapshots>) {
  const map: SnapshotMap = {};
  for (const snapshot of snapshots) {
    map[snapshotKey(snapshot.scopeType, snapshot.scopeKey, snapshot.scopeReferenceId)] = snapshot;
  }
  return map;
}

function getSnapshot(
  map: SnapshotMap,
  scopeType: string,
  scopeKeyValue: string | null,
  scopeReferenceId: string | null,
) {
  return map[snapshotKey(scopeType, scopeKeyValue, scopeReferenceId)] ?? null;
}

function sortByPanels<T extends { panelEquivalentQuantity: number }>(rows: T[]) {
  return [...rows].sort((left, right) => right.panelEquivalentQuantity - left.panelEquivalentQuantity);
}

function toRawRows(
  rows: Awaited<ReturnType<typeof loadMetricSourceRows>>,
  releaseSnapshotMap: SnapshotMap,
) {
  return rows.map((row) => ({
    ...row,
    releaseCompletionPercent:
      getSnapshot(releaseSnapshotMap, "RELEASE", row.releaseCode, row.releaseId)?.metrics
        .completion.completionPercent ?? null,
  }));
}

function toPivotRows(rows: ReportRawRow[], windowType: ReportFilterInput["windowType"]): PivotExportRow[] {
  return rows.map((row) => ({
    businessDate: row.businessDate,
    windowType,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    departmentCode: row.departmentCode,
    departmentName: row.departmentName,
    jobNumber: row.jobNumber,
    releaseCode: row.releaseCode,
    partFamily: row.partFamily ?? "UNMAPPED",
    nativeUnitType: row.nativeUnitType,
    nativeQuantity: row.nativeQuantity,
    panelEquivalentQuantity: row.panelEquivalentQuantity,
    verificationStatus: row.verificationStatus,
    isLocked: row.isLocked,
    wasEdited: row.wasEdited,
    isRework: row.isRework,
    reworkSource: row.reworkSource,
    faultDepartmentCode: row.faultDepartmentCode ?? "",
    fixingDepartmentCode: row.fixingDepartmentCode ?? "",
    releaseExpectedPanels: row.releaseExpectedPanels ?? 0,
    releaseCompletionPercent: row.releaseCompletionPercent,
    releaseIsStale: row.releaseIsStale,
    submissionReopenCount: row.submissionReopenCount,
  }));
}

function tableFromObjects(input: {
  id: string;
  title: string;
  description: string;
  rows: Record<string, string | number | boolean | null>[];
}) {
  const columns = Array.from(
    new Set(input.rows.flatMap((row) => Object.keys(row))),
  );

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    columns,
    rows: input.rows.map((row) =>
      columns.map((column) => {
        const value = row[column];
        if (typeof value === "boolean") {
          return value ? "Yes" : "No";
        }
        if (value === null || value === undefined) {
          return "";
        }
        return String(value);
      }),
    ),
  } satisfies ReportTabularSection;
}

function summaryCardsFromSnapshot(
  snapshot: ReturnType<typeof buildMetricSnapshots>[number],
): ReportSummaryCard[] {
  return [
    {
      label: "Panel output",
      value: formatNumber(snapshot.metrics.output.nonReworkPanelEquivalentTotal),
      hint: "Non-rework panel-equivalent output",
      tone: "accent",
    },
    {
      label: "Completion",
      value:
        snapshot.metrics.completion.completionPercent === null
          ? "N/A"
          : formatPercent(snapshot.metrics.completion.completionPercent / 100),
      hint: `${formatNumber(snapshot.metrics.completion.completedPanels)} of ${formatNumber(snapshot.metrics.completion.expectedPanels)} expected panels`,
    },
    {
      label: "Unverified",
      value: formatNumber(snapshot.metrics.accountability.unverifiedEntryCount),
      hint: "Entries still awaiting lead verification",
      tone: snapshot.metrics.accountability.unverifiedEntryCount > 0 ? "warning" : "default",
    },
    {
      label: "Rework panels",
      value: formatNumber(snapshot.metrics.rework.reworkPanelEquivalentTotal),
      hint: "Internal and installer-fault remake volume",
    },
  ];
}

function buildExecutiveSections(input: {
  departmentSnapshots: ReturnType<typeof buildMetricSnapshots>;
  employeeSnapshots: ReturnType<typeof buildMetricSnapshots>;
  jobSnapshots: ReturnType<typeof buildMetricSnapshots>;
  rawRows: ReportRawRow[];
}) {
  const departmentSection = tableFromObjects({
    id: "departments",
    title: "Department drilldown",
    description: "Normalized department throughput and verification coverage.",
    rows: input.departmentSnapshots
      .filter((snapshot) => snapshot.scopeType === "DEPARTMENT")
      .map((snapshot) => ({
        department: snapshot.label,
        panelOutput: formatNumber(snapshot.metrics.output.nonReworkPanelEquivalentTotal),
        completionPercent:
          snapshot.metrics.completion.completionPercent === null
            ? "N/A"
            : formatPercent(snapshot.metrics.completion.completionPercent / 100),
        unverifiedEntries: snapshot.metrics.accountability.unverifiedEntryCount,
        reworkPanels: formatNumber(snapshot.metrics.rework.reworkPanelEquivalentTotal),
      })),
  });

  const employeeSection = tableFromObjects({
    id: "employees",
    title: "Employee drilldown",
    description: "Highest panel-equivalent contributors in the current window.",
    rows: input.employeeSnapshots
      .filter((snapshot) => snapshot.scopeType === "EMPLOYEE")
      .sort(
        (left, right) =>
          right.metrics.output.nonReworkPanelEquivalentTotal -
          left.metrics.output.nonReworkPanelEquivalentTotal,
      )
      .slice(0, 8)
      .map((snapshot) => ({
        employee: snapshot.label,
        panelOutput: formatNumber(snapshot.metrics.output.nonReworkPanelEquivalentTotal),
        verifiedPanels: formatNumber(snapshot.metrics.output.verifiedPanelEquivalentTotal),
        editedEntries: snapshot.metrics.accountability.editedEntryCount,
      })),
  });

  const bottleneckSection = tableFromObjects({
    id: "gaps",
    title: "Bottleneck and gap view",
    description: "Areas with completion drag, stale baselines, or verification gaps.",
    rows: input.jobSnapshots
      .filter((snapshot) => snapshot.scopeType === "JOB")
      .sort((left, right) => {
        const leftGap = left.metrics.accountability.unverifiedEntryCount + left.metrics.accountability.staleBaselineReleaseCount;
        const rightGap = right.metrics.accountability.unverifiedEntryCount + right.metrics.accountability.staleBaselineReleaseCount;
        return rightGap - leftGap;
      })
      .slice(0, 6)
      .map((snapshot) => ({
        job: snapshot.label,
        completionPercent:
          snapshot.metrics.completion.completionPercent === null
            ? "N/A"
            : formatPercent(snapshot.metrics.completion.completionPercent / 100),
        unverifiedEntries: snapshot.metrics.accountability.unverifiedEntryCount,
        staleImpactPanels: formatNumber(snapshot.metrics.accountability.staleBaselinePanelImpact),
        missingMappings: snapshot.metrics.accountability.missingMappingCount,
      })),
  });

  return [departmentSection, employeeSection, bottleneckSection];
}

function buildFilteredViewModel(input: {
  title: string;
  description: string;
  eyebrow: string;
  scopeLabel: string;
  view: ReportFilterInput["view"];
  range: ReturnType<typeof getMetricWindowRange>;
  snapshot: ReturnType<typeof buildMetricSnapshots>[number];
  rawRows: ReportRawRow[];
  summarySections: ReportTabularSection[];
  pivotRows: PivotExportRow[];
  links: ReportLink[];
  templates: SavedReportTemplate[];
  activeTemplate: SavedReportTemplate | null;
  templateDefaults: {
    scopeType: ReportViewModel["templateDefaults"]["scopeType"];
    scopeKey: string | null;
  };
}): ReportViewModel {
  return {
    title: input.title,
    eyebrow: input.eyebrow,
    description: input.description,
    view: input.view,
    range: input.range,
    scopeLabel: input.scopeLabel,
    summaryCards: summaryCardsFromSnapshot(input.snapshot),
    summarySections: input.summarySections,
    rawSection: tableFromObjects({
      id: "raw",
      title: "Raw detail",
      description: "Append-ready operational rows for audit and investigation.",
      rows: input.rawRows.map((row) => ({
        businessDate: row.businessDate,
        employee: `${row.employeeCode} ${row.employeeName}`,
        department: row.departmentName,
        job: row.jobNumber,
        release: row.releaseCode,
        nativeQuantity: formatNumber(row.nativeQuantity),
        panelEquivalent: formatNumber(row.panelEquivalentQuantity),
        verified: row.verificationStatus,
        rework: row.isRework,
        remakeSource: row.reworkSource,
        completionPercent:
          row.releaseCompletionPercent === null
            ? "N/A"
            : formatPercent(row.releaseCompletionPercent / 100),
      })),
    }),
    pivotSection: tableFromObjects({
      id: "pivot",
      title: "Pivot-ready export",
      description: "Flat dimensional structure for Excel pivots and downstream BI.",
      rows: input.pivotRows.map((row) => ({
        businessDate: row.businessDate,
        employeeCode: row.employeeCode,
        departmentCode: row.departmentCode,
        jobNumber: row.jobNumber,
        releaseCode: row.releaseCode,
        panelEquivalentQuantity: row.panelEquivalentQuantity,
        reworkSource: row.reworkSource,
        releaseCompletionPercent:
          row.releaseCompletionPercent === null
            ? "N/A"
            : formatPercent(row.releaseCompletionPercent / 100),
      })),
    }),
    rawRows: input.rawRows,
    pivotRows: input.pivotRows,
    links: input.links,
    templates: input.templates,
    activeTemplate: input.activeTemplate,
    templateDefaults: input.templateDefaults,
  };
}

export async function buildReportViewModel(rawInput: ReportFilterInput) {
  const input = reportFilterSchema.parse(rawInput);
  const range = getMetricWindowRange(input.windowType, input.anchorDate);
  const [rows, targets, templates] = await Promise.all([
    loadMetricSourceRows(range),
    loadMetricTargets(range),
    getSavedReportTemplates(),
  ]);
  const activeTemplate = input.templateId
    ? await getReportTemplateById(input.templateId)
    : null;
  const snapshots = buildMetricSnapshots({ rows, targets, range });
  const snapshotMap = buildSnapshotMap(snapshots);
  const departmentSnapshots = snapshots.filter((snapshot) => snapshot.scopeType === "DEPARTMENT");
  const employeeSnapshots = snapshots.filter((snapshot) => snapshot.scopeType === "EMPLOYEE");
  const jobSnapshots = snapshots.filter((snapshot) => snapshot.scopeType === "JOB");
  const releaseSnapshots = snapshots.filter((snapshot) => snapshot.scopeType === "RELEASE");
  const rawRows = toRawRows(rows, snapshotMap);
  const pivotRows = toPivotRows(rawRows, input.windowType);

  const companySnapshot = getSnapshot(snapshotMap, "COMPANY", "ELWARD_SYSTEMS", null);
  if (!companySnapshot) {
    throw new Error("No reporting data is available for the requested window.");
  }

  if (input.view === "EXECUTIVE") {
    return {
      title: "Executive Overview",
      eyebrow: "Reporting center",
      description:
        "Cross-company panel-equivalent output, completion, accountability, and gap signals.",
      view: input.view,
      range,
      scopeLabel: "Elward Systems",
      summaryCards: summaryCardsFromSnapshot(companySnapshot),
      summarySections: buildExecutiveSections({
        departmentSnapshots,
        employeeSnapshots,
        jobSnapshots,
        rawRows,
      }),
      rawSection: tableFromObjects({
        id: "raw",
        title: "Raw detail",
        description: "Company-wide operational rows in the selected window.",
        rows: sortByPanels(rawRows).map((row) => ({
          businessDate: row.businessDate,
          employee: `${row.employeeCode} ${row.employeeName}`,
          department: row.departmentName,
          job: row.jobNumber,
          release: row.releaseCode,
          panelEquivalent: formatNumber(row.panelEquivalentQuantity),
          verificationStatus: row.verificationStatus,
          isRework: row.isRework,
          staleBaseline: row.releaseIsStale,
        })),
      }),
      pivotSection: tableFromObjects({
        id: "pivot",
        title: "Pivot-ready export",
        description: "Flat export for spreadsheet pivots and BI ingestion.",
        rows: pivotRows.map((row) => ({
          businessDate: row.businessDate,
          departmentCode: row.departmentCode,
          employeeCode: row.employeeCode,
          jobNumber: row.jobNumber,
          releaseCode: row.releaseCode,
          partFamily: row.partFamily,
          panelEquivalentQuantity: row.panelEquivalentQuantity,
          isRework: row.isRework,
          submissionReopenCount: row.submissionReopenCount,
        })),
      }),
      rawRows,
      pivotRows,
      links: [
        ...departmentSnapshots.slice(0, 1).map((snapshot) => ({
          href: `/ops/reports/departments/${snapshot.scopeKey}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
          label: `${snapshot.label} department`,
        })),
        ...employeeSnapshots.slice(0, 1).map((snapshot) => ({
          href: `/ops/reports/employees/${snapshot.scopeKey}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
          label: `${snapshot.label} employee`,
        })),
        ...jobSnapshots.slice(0, 1).map((snapshot) => ({
          href: `/ops/reports/jobs/${snapshot.scopeKey}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
          label: `Job ${snapshot.scopeKey}`,
        })),
        ...releaseSnapshots.slice(0, 1).map((snapshot) => ({
          href: `/ops/reports/releases/${snapshot.scopeKey}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
          label: `Release ${snapshot.scopeKey}`,
        })),
        { href: "/ops/reports/accountability", label: "Accountability view" },
        { href: "/ops/reports/rework", label: "Rework view" },
        { href: "/ops/reports/bottlenecks", label: "Bottleneck view" },
      ],
      templates,
      activeTemplate,
      templateDefaults: {
        scopeType: "COMPANY",
        scopeKey: "ELWARD_SYSTEMS",
      },
    } satisfies ReportViewModel;
  }

  if (input.view === "ACCOUNTABILITY") {
    return buildFilteredViewModel({
      title: "Accountability View",
      description: "Edited entries, unverified work, reopen activity, missing mappings, and stale-baseline impact.",
      eyebrow: "Reporting center",
      scopeLabel: "Company-wide accountability",
      view: input.view,
      range,
      snapshot: companySnapshot,
      rawRows: rawRows.filter((row) => row.wasEdited || row.verificationStatus !== "VERIFIED" || row.releaseIsStale || row.submissionReopenCount > 0),
      summarySections: [
        tableFromObjects({
          id: "accountability",
          title: "Accountability rollup",
          description: "Snapshot-level accountability metrics by department.",
          rows: departmentSnapshots.map((snapshot) => ({
            department: snapshot.label,
            editedEntries: snapshot.metrics.accountability.editedEntryCount,
            unverifiedEntries: snapshot.metrics.accountability.unverifiedEntryCount,
            reopenEvents: snapshot.metrics.accountability.reopenEventCount,
            staleImpactPanels: formatNumber(snapshot.metrics.accountability.staleBaselinePanelImpact),
            missingMappings: snapshot.metrics.accountability.missingMappingCount,
          })),
        }),
      ],
      pivotRows,
      links: [
        { href: "/ops/reports", label: "Executive overview" },
        { href: "/ops/reports/bottlenecks", label: "Bottleneck view" },
      ],
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "COMPANY", scopeKey: "ELWARD_SYSTEMS" },
    });
  }

  if (input.view === "REWORK") {
    return buildFilteredViewModel({
      title: "Rework View",
      description: "Fault-zone and fixing-zone remake volume, split between internal and installer-fault work.",
      eyebrow: "Reporting center",
      scopeLabel: "Company-wide rework",
      view: input.view,
      range,
      snapshot: companySnapshot,
      rawRows: rawRows.filter((row) => row.isRework),
      summarySections: [
        tableFromObjects({
          id: "rework-zones",
          title: "Rework zone summary",
          description: "Internal and installer-fault remake attribution.",
          rows: departmentSnapshots.map((snapshot) => ({
            department: snapshot.label,
            reworkPanels: formatNumber(snapshot.metrics.rework.reworkPanelEquivalentTotal),
            internalFaultPanels: formatNumber(snapshot.metrics.rework.internalFaultRemakePanels),
            installerFaultPanels: formatNumber(snapshot.metrics.rework.installerFaultRemakePanels),
          })),
        }),
      ],
      pivotRows: pivotRows.filter((row) => row.isRework),
      links: [
        { href: "/ops/reports", label: "Executive overview" },
        { href: "/ops/reports/accountability", label: "Accountability view" },
      ],
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "COMPANY", scopeKey: "ELWARD_SYSTEMS" },
    });
  }

  if (input.view === "BOTTLENECK") {
    return buildFilteredViewModel({
      title: "Bottleneck and Gap View",
      description: "Departments and jobs with the strongest throughput drag, verification backlog, or stale baseline exposure.",
      eyebrow: "Reporting center",
      scopeLabel: "Company-wide bottlenecks",
      view: input.view,
      range,
      snapshot: companySnapshot,
      rawRows,
      summarySections: [
        tableFromObjects({
          id: "bottlenecks",
          title: "Gap ranking",
          description: "Jobs with the largest backlog indicators in the selected window.",
          rows: jobSnapshots
            .sort((left, right) => {
              const leftScore =
                left.metrics.accountability.unverifiedEntryCount +
                left.metrics.accountability.staleBaselineReleaseCount +
                left.metrics.accountability.missingMappingCount;
              const rightScore =
                right.metrics.accountability.unverifiedEntryCount +
                right.metrics.accountability.staleBaselineReleaseCount +
                right.metrics.accountability.missingMappingCount;
              return rightScore - leftScore;
            })
            .slice(0, 8)
            .map((snapshot) => ({
              job: snapshot.label,
              completionPercent:
                snapshot.metrics.completion.completionPercent === null
                  ? "N/A"
                  : formatPercent(snapshot.metrics.completion.completionPercent / 100),
              unverifiedEntries: snapshot.metrics.accountability.unverifiedEntryCount,
              staleImpactPanels: formatNumber(snapshot.metrics.accountability.staleBaselinePanelImpact),
              missingMappings: snapshot.metrics.accountability.missingMappingCount,
            })),
        }),
      ],
      pivotRows,
      links: [
        { href: "/ops/reports", label: "Executive overview" },
        { href: "/ops/reports/rework", label: "Rework view" },
      ],
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "COMPANY", scopeKey: "ELWARD_SYSTEMS" },
    });
  }

  if (!input.scopeKey) {
    throw new Error("This report view requires a scope key.");
  }

  if (input.view === "DEPARTMENT") {
    const scopedRows = rawRows.filter((row) => row.departmentCode === input.scopeKey);
    const snapshot = departmentSnapshots.find((item) => item.scopeKey === input.scopeKey);
    if (!snapshot) {
      throw new Error("Department reporting scope was not found.");
    }

    return buildFilteredViewModel({
      title: `${snapshot.label} Department`,
      description: "Department throughput, employee contribution, active release work, and verification gaps.",
      eyebrow: "Department drilldown",
      scopeLabel: snapshot.label,
      view: input.view,
      range,
      snapshot,
      rawRows: scopedRows,
      summarySections: [
        tableFromObjects({
          id: "contributors",
          title: "Employee contribution",
          description: "Department contributors in the selected window.",
          rows: employeeSnapshots
            .filter((employeeSnapshot) =>
              scopedRows.some((row) => row.employeeCode === employeeSnapshot.scopeKey),
            )
            .map((employeeSnapshot) => ({
              employee: employeeSnapshot.label,
              panelOutput: formatNumber(employeeSnapshot.metrics.output.nonReworkPanelEquivalentTotal),
              verifiedPanels: formatNumber(employeeSnapshot.metrics.output.verifiedPanelEquivalentTotal),
              editedEntries: employeeSnapshot.metrics.accountability.editedEntryCount,
            })),
        }),
      ],
      pivotRows: toPivotRows(scopedRows, input.windowType),
      links: scopedRows.slice(0, 4).map((row) => ({
        href: `/ops/reports/employees/${row.employeeCode}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
        label: row.employeeName,
      })),
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "DEPARTMENT", scopeKey: input.scopeKey },
    });
  }

  if (input.view === "EMPLOYEE") {
    const scopedRows = rawRows.filter((row) => row.employeeCode === input.scopeKey);
    const snapshot = employeeSnapshots.find((item) => item.scopeKey === input.scopeKey);
    if (!snapshot) {
      throw new Error("Employee reporting scope was not found.");
    }

    return buildFilteredViewModel({
      title: snapshot.label,
      description: "Employee production history, release contribution, and accountability markers.",
      eyebrow: "Employee drilldown",
      scopeLabel: snapshot.label,
      view: input.view,
      range,
      snapshot,
      rawRows: scopedRows,
      summarySections: [
        tableFromObjects({
          id: "release-work",
          title: "Job and release contribution",
          description: "Release-level work this employee touched in the selected window.",
          rows: scopedRows.map((row) => ({
            job: row.jobNumber,
            release: row.releaseCode,
            department: row.departmentName,
            panelEquivalent: formatNumber(row.panelEquivalentQuantity),
            verificationStatus: row.verificationStatus,
          })),
        }),
      ],
      pivotRows: toPivotRows(scopedRows, input.windowType),
      links: scopedRows.slice(0, 4).map((row) => ({
        href: `/ops/reports/releases/${row.releaseCode}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
        label: `${row.jobNumber} ${row.releaseCode}`,
      })),
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "EMPLOYEE", scopeKey: input.scopeKey },
    });
  }

  if (input.view === "JOB") {
    const scopedRows = rawRows.filter((row) => row.jobNumber === input.scopeKey);
    const snapshot = jobSnapshots.find((item) => item.scopeKey === input.scopeKey);
    if (!snapshot) {
      throw new Error("Job reporting scope was not found.");
    }

    return buildFilteredViewModel({
      title: `Job ${input.scopeKey}`,
      description: "Job-wide completion, release progress, rework, and accountability exposure.",
      eyebrow: "Job drilldown",
      scopeLabel: input.scopeKey,
      view: input.view,
      range,
      snapshot,
      rawRows: scopedRows,
      summarySections: [
        tableFromObjects({
          id: "releases",
          title: "Release rollup",
          description: "Release completion and stale-baseline impact for this job.",
          rows: releaseSnapshots
            .filter((item) => scopedRows.some((row) => row.releaseCode === item.scopeKey))
            .map((item) => ({
              release: item.scopeKey ?? item.label,
              completionPercent:
                item.metrics.completion.completionPercent === null
                  ? "N/A"
                  : formatPercent(item.metrics.completion.completionPercent / 100),
              unverifiedEntries: item.metrics.accountability.unverifiedEntryCount,
              staleImpactPanels: formatNumber(item.metrics.accountability.staleBaselinePanelImpact),
            })),
        }),
      ],
      pivotRows: toPivotRows(scopedRows, input.windowType),
      links: Array.from(new Set(scopedRows.map((row) => row.releaseCode))).map((releaseCode) => ({
        href: `/ops/reports/releases/${releaseCode}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
        label: releaseCode,
      })),
      templates,
      activeTemplate,
      templateDefaults: { scopeType: "JOB", scopeKey: input.scopeKey },
    });
  }

  const scopedRows = rawRows.filter((row) => row.releaseCode === input.scopeKey);
  const snapshot = releaseSnapshots.find((item) => item.scopeKey === input.scopeKey);
  if (!snapshot) {
    throw new Error("Release reporting scope was not found.");
  }

  return buildFilteredViewModel({
    title: `Release ${input.scopeKey}`,
    description: "Release completion, raw detail, accountability, and remake traceability.",
    eyebrow: "Release drilldown",
    scopeLabel: input.scopeKey,
    view: input.view,
    range,
    snapshot,
    rawRows: scopedRows,
    summarySections: [
      tableFromObjects({
        id: "release-metrics",
        title: "Release summary",
        description: "Completion, stale baseline exposure, and part-family context.",
        rows: [
          {
            release: input.scopeKey,
            partFamily: scopedRows[0]?.partFamily ?? "UNMAPPED",
            expectedPanels: formatNumber(snapshot.metrics.completion.expectedPanels),
            completedPanels: formatNumber(snapshot.metrics.completion.completedPanels),
            completionPercent:
              snapshot.metrics.completion.completionPercent === null
                ? "N/A"
                : formatPercent(snapshot.metrics.completion.completionPercent / 100),
            staleBaselinePanels: formatNumber(snapshot.metrics.accountability.staleBaselinePanelImpact),
          },
        ],
      }),
    ],
    pivotRows: toPivotRows(scopedRows, input.windowType),
    links: Array.from(new Set(scopedRows.map((row) => row.employeeCode))).map((employeeCode) => ({
      href: `/ops/reports/employees/${employeeCode}?windowType=${input.windowType}&anchorDate=${input.anchorDate}`,
      label: employeeCode,
    })),
    templates,
    activeTemplate,
    templateDefaults: { scopeType: "RELEASE", scopeKey: input.scopeKey },
  });
}
