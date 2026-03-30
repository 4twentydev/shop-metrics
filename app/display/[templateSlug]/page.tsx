import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPinnedTemplateBySlug } from "@/features/reporting/admin-queries";
import { hasPublicDisplayAccess } from "@/features/reporting/display-auth";
import { ReportDisplayView } from "@/features/reporting/components/report-display-view";
import { getPinnedReportTemplates } from "@/features/reporting/queries";
import { buildReportViewModel } from "@/features/reporting/service";

export const metadata: Metadata = {
  title: "Public Reporting Display",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{
    templateSlug: string;
  }>;
  searchParams: Promise<{
    access?: string;
    anchorDate?: string;
  }>;
};

export default async function PublicReportingDisplayPage({
  params,
  searchParams,
}: PageProps) {
  const [{ templateSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasPublicDisplayAccess(resolvedSearchParams.access ?? null)) {
    notFound();
  }

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

  const nextSearch = new URLSearchParams({
    access: resolvedSearchParams.access ?? "",
  });

  if (resolvedSearchParams.anchorDate) {
    nextSearch.set("anchorDate", resolvedSearchParams.anchorDate);
  }

  return (
    <ReportDisplayView
      data={data}
      pinnedTemplates={pinnedTemplates.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
      }))}
      templateBasePath="/display"
      linkQueryString={`?${nextSearch.toString()}`}
    />
  );
}
