import type { Metadata } from "next";

import { ReportingAdminView } from "@/features/reporting/components/report-admin-view";
import { getReportingAdminPageData } from "@/features/reporting/admin-queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Reporting Admin",
};

export default async function ReportingAdminPage() {
  await requireOpsRole();
  const data = await getReportingAdminPageData();

  return <ReportingAdminView data={data} />;
}
