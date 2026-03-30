import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportDisplayView } from "@/features/reporting/components/report-display-view";
import { getPinnedTemplateBySlug } from "@/features/reporting/admin-queries";
import { getPinnedReportTemplates } from "@/features/reporting/queries";
import { buildReportViewModel } from "@/features/reporting/service";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Reporting Display",
};

type PageProps = {
  params: Promise<{
    templateSlug: string;
  }>;
  searchParams: Promise<{
    anchorDate?: string;
  }>;
};

export default async function ReportingDisplayPage({
  params,
  searchParams,
}: PageProps) {
  await requireOpsRole();
  const [{ templateSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const [template, pinnedTemplates] = await Promise.all([
    getPinnedTemplateBySlug(templateSlug),
    getPinnedReportTemplates(),
  ]);

  if (!template) {
    notFound();
  }

  const data = await buildReportViewModel({
    view: template.viewType,
    windowType: template.defaultWindowType,
    anchorDate: resolvedSearchParams.anchorDate ?? "2026-03-29",
    scopeKey: template.scopeKey ?? null,
    templateId: template.id,
  });

  return (
    <ReportDisplayView
      data={data}
      pinnedTemplates={pinnedTemplates.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
      }))}
      templateBasePath="/ops/reports/display"
      linkQueryString={
        resolvedSearchParams.anchorDate
          ? `?${new URLSearchParams({
              anchorDate: resolvedSearchParams.anchorDate,
            }).toString()}`
          : ""
      }
    />
  );
}
