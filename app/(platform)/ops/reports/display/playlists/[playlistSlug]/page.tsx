import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DisplayPlaylistRuntime } from "@/features/reporting/components/display-playlist-runtime";
import { ReportDisplayView } from "@/features/reporting/components/report-display-view";
import { getDisplayPlaylistBySlug } from "@/features/reporting/display-queries";
import { getPinnedReportTemplates } from "@/features/reporting/queries";
import { buildReportViewModel } from "@/features/reporting/service";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Display Playlist Preview",
};

type PageProps = {
  params: Promise<{
    playlistSlug: string;
  }>;
  searchParams: Promise<{
    anchorDate?: string;
    step?: string;
    screen?: string;
    label?: string;
  }>;
};

export default async function OpsDisplayPlaylistPreviewPage({
  params,
  searchParams,
}: PageProps) {
  await requireOpsRole();
  const [{ playlistSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const playlist = await getDisplayPlaylistBySlug(playlistSlug, {
    includeInactive: true,
  });
  if (!playlist || playlist.items.length === 0) {
    notFound();
  }

  const parsedStep = Number.parseInt(resolvedSearchParams.step ?? "0", 10);
  const step = Number.isFinite(parsedStep) && parsedStep >= 0 ? parsedStep : 0;
  const currentIndex = step % playlist.items.length;
  const currentItem = playlist.items[currentIndex]!;

  const [data, pinnedTemplates] = await Promise.all([
    buildReportViewModel({
      view: currentItem.viewType,
      windowType: currentItem.defaultWindowType,
      anchorDate: resolvedSearchParams.anchorDate ?? "2026-03-29",
      scopeKey: currentItem.scopeKey ?? null,
      templateId: currentItem.templateId,
    }),
    getPinnedReportTemplates(),
  ]);

  const queryString = new URLSearchParams();
  if (resolvedSearchParams.anchorDate) {
    queryString.set("anchorDate", resolvedSearchParams.anchorDate);
  }

  return (
    <>
      <DisplayPlaylistRuntime
        playlistId={playlist.id}
        playlistSlug={playlist.slug}
        accessToken=""
        basePath="/ops/reports/display/playlists"
        screenKey={resolvedSearchParams.screen ?? `ops-${playlist.slug}`}
        screenLabel={resolvedSearchParams.label ?? `${playlist.name} Preview`}
        currentIndex={currentIndex}
        totalItems={playlist.items.length}
        rotationSeconds={playlist.rotationSeconds}
        heartbeatIntervalSeconds={playlist.heartbeatIntervalSeconds}
        currentTemplateSlug={currentItem.templateSlug}
        {...(resolvedSearchParams.anchorDate !== undefined && {
          anchorDate: resolvedSearchParams.anchorDate,
        })}
      />
      <ReportDisplayView
        data={data}
        pinnedTemplates={pinnedTemplates.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
        }))}
        templateBasePath="/ops/reports/display"
        linkQueryString={queryString.size > 0 ? `?${queryString.toString()}` : ""}
        hideTemplateNav
      />
    </>
  );
}
