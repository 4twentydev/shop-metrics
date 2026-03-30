import type { Metadata } from "next";

import { ReportDashboardView } from "@/features/reporting/components/report-dashboard-view";
import { buildReportViewModel } from "@/features/reporting/service";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Employee Report",
};

type PageProps = {
  params: Promise<{
    employeeCode: string;
  }>;
  searchParams: Promise<{
    windowType?: string;
    anchorDate?: string;
    templateId?: string;
  }>;
};

export default async function EmployeeReportPage({
  params,
  searchParams,
}: PageProps) {
  await requireOpsRole();
  const [{ employeeCode }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const data = await buildReportViewModel({
    view: "EMPLOYEE",
    scopeKey: employeeCode,
    windowType: (resolvedSearchParams.windowType as "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL") ?? "DAILY",
    anchorDate: resolvedSearchParams.anchorDate ?? "2026-03-29",
    templateId: resolvedSearchParams.templateId ?? null,
  });

  return <ReportDashboardView data={data} />;
}
