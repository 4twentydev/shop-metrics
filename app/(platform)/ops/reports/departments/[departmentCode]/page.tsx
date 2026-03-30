import type { Metadata } from "next";

import { ReportDashboardView } from "@/features/reporting/components/report-dashboard-view";
import { buildReportViewModel } from "@/features/reporting/service";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Department Report",
};

type PageProps = {
  params: Promise<{
    departmentCode: string;
  }>;
  searchParams: Promise<{
    windowType?: string;
    anchorDate?: string;
    templateId?: string;
  }>;
};

export default async function DepartmentReportPage({
  params,
  searchParams,
}: PageProps) {
  await requireOpsRole();
  const [{ departmentCode }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const data = await buildReportViewModel({
    view: "DEPARTMENT",
    scopeKey: departmentCode,
    windowType: (resolvedSearchParams.windowType as "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL") ?? "DAILY",
    anchorDate: resolvedSearchParams.anchorDate ?? "2026-03-29",
    templateId: resolvedSearchParams.templateId ?? null,
  });

  return <ReportDashboardView data={data} />;
}
