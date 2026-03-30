import { redirect } from "next/navigation";

import { getPinnedReportTemplates } from "@/features/reporting/queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export default async function ReportingDisplayIndexPage() {
  await requireOpsRole();
  const templates = await getPinnedReportTemplates();

  if (templates.length === 0) {
    redirect("/ops/reports");
  }

  redirect(`/ops/reports/display/${templates[0]!.slug}`);
}
