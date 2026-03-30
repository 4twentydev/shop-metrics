import type { MetricScope, MetricWindow, MetricWindowRange, MetricSourceRow } from "@/features/metrics/types";

export const reportViewValues = [
  "EXECUTIVE",
  "DEPARTMENT",
  "EMPLOYEE",
  "JOB",
  "RELEASE",
  "ACCOUNTABILITY",
  "REWORK",
  "BOTTLENECK",
] as const;

export const reportExportFormatValues = ["web", "csv", "excel", "pdf"] as const;
export const reportDatasetValues = ["summary", "raw", "pivot"] as const;

export type ReportView = (typeof reportViewValues)[number];
export type ReportExportFormat = (typeof reportExportFormatValues)[number];
export type ReportDataset = (typeof reportDatasetValues)[number];

export type ReportTemplateConfig = {
  includeSummary: boolean;
  includeRaw: boolean;
  includePivot: boolean;
  highlightAccountability: boolean;
  highlightBottlenecks: boolean;
  mobileCondensed: boolean;
};

export type SavedReportTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  viewType: ReportView;
  defaultWindowType: MetricWindow;
  scopeType: MetricScope | null;
  scopeReferenceId: string | null;
  scopeKey: string | null;
  sectionConfig: ReportTemplateConfig;
  isPinned: boolean;
  deletedAt?: Date | null;
  deletionReason?: string | null;
};

export type ReportFilterInput = {
  view: ReportView;
  windowType: MetricWindow;
  anchorDate: string;
  scopeKey?: string | null;
  templateId?: string | null;
};

export type ReportSummaryCard = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "accent" | "warning";
};

export type ReportTabularSection = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
};

export type ReportRawRow = MetricSourceRow & {
  releaseCompletionPercent: number | null;
};

export type PivotExportRow = {
  businessDate: string;
  windowType: MetricWindow;
  employeeCode: string;
  employeeName: string;
  departmentCode: string;
  departmentName: string;
  jobNumber: string;
  releaseCode: string;
  partFamily: string;
  nativeUnitType: string;
  nativeQuantity: number;
  panelEquivalentQuantity: number;
  verificationStatus: string;
  isLocked: boolean;
  wasEdited: boolean;
  isRework: boolean;
  reworkSource: string;
  faultDepartmentCode: string;
  fixingDepartmentCode: string;
  releaseExpectedPanels: number;
  releaseCompletionPercent: number | null;
  releaseIsStale: boolean;
  submissionReopenCount: number;
};

export type ReportLink = {
  href: string;
  label: string;
};

export type ReportViewModel = {
  title: string;
  eyebrow: string;
  description: string;
  view: ReportView;
  range: MetricWindowRange;
  scopeLabel: string;
  summaryCards: ReportSummaryCard[];
  summarySections: ReportTabularSection[];
  rawSection: ReportTabularSection;
  pivotSection: ReportTabularSection;
  rawRows: ReportRawRow[];
  pivotRows: PivotExportRow[];
  links: ReportLink[];
  templates: SavedReportTemplate[];
  activeTemplate: SavedReportTemplate | null;
  templateDefaults: {
    scopeType: MetricScope | null;
    scopeKey: string | null;
  };
};
