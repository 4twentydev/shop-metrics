import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPinnedReportTemplates } from "@/features/reporting/queries";
import { ReportDisplayView } from "@/features/reporting/components/report-display-view";
import { DisplayPlaylistRuntime } from "@/features/reporting/components/display-playlist-runtime";
import { hasPublicDisplayAccess } from "@/features/reporting/display-auth";
import { getDisplayPlaylistBySlug } from "@/features/reporting/display-queries";
import { buildReportViewModel } from "@/features/reporting/service";

export const metadata: Metadata = {
  title: "Display Playlist",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{
    playlistSlug: string;
  }>;
  searchParams: Promise<{
    access?: string;
    anchorDate?: string;
    step?: string;
    screen?: string;
    label?: string;
  }>;
};

export default async function DisplayPlaylistPage({
  params,
  searchParams,
}: PageProps) {
  const [{ playlistSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasPublicDisplayAccess(resolvedSearchParams.access ?? null)) {
    notFound();
  }

  const playlist = await getDisplayPlaylistBySlug(playlistSlug);
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

  const queryString = new URLSearchParams({
    access: resolvedSearchParams.access ?? "",
  });

  if (resolvedSearchParams.anchorDate) {
    queryString.set("anchorDate", resolvedSearchParams.anchorDate);
  }

  return (
    <>
      <DisplayPlaylistRuntime
        playlistId={playlist.id}
        playlistSlug={playlist.slug}
        accessToken={resolvedSearchParams.access ?? ""}
        screenKey={resolvedSearchParams.screen ?? playlist.slug}
        screenLabel={resolvedSearchParams.label ?? playlist.name}
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
        templateBasePath="/display"
        linkQueryString={`?${queryString.toString()}`}
        hideTemplateNav
      />
    </>
  );
}
