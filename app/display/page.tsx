import { notFound, redirect } from "next/navigation";

import { hasPublicDisplayAccess } from "@/features/reporting/display-auth";
import { getPinnedReportTemplates } from "@/features/reporting/queries";

type PageProps = {
  searchParams: Promise<{
    access?: string;
    anchorDate?: string;
  }>;
};

export default async function PublicDisplayIndexPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  if (!hasPublicDisplayAccess(resolvedSearchParams.access ?? null)) {
    notFound();
  }

  const templates = await getPinnedReportTemplates();

  if (templates.length === 0) {
    redirect("/ops/reports");
  }

  const nextSearch = new URLSearchParams({
    access: resolvedSearchParams.access ?? "",
  });

  if (resolvedSearchParams.anchorDate) {
    nextSearch.set("anchorDate", resolvedSearchParams.anchorDate);
  }

  redirect(`/display/${templates[0]!.slug}?${nextSearch.toString()}`);
}
