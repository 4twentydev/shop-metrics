import { notFound, redirect } from "next/navigation";

import { hasPublicDisplayAccess } from "@/features/reporting/display-auth";
import { getScheduledDisplayPlaylist } from "@/features/reporting/display-queries";

type PageProps = {
  searchParams: Promise<{
    access?: string;
    anchorDate?: string;
    department?: string;
    shift?: string;
    screen?: string;
    label?: string;
  }>;
};

export default async function DisplaySchedulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  if (!hasPublicDisplayAccess(resolvedSearchParams.access ?? null)) {
    notFound();
  }

  const playlist = await getScheduledDisplayPlaylist({
    departmentCode: resolvedSearchParams.department ?? null,
    shiftCode: resolvedSearchParams.shift ?? null,
  });

  if (!playlist) {
    notFound();
  }

  const query = new URLSearchParams({
    access: resolvedSearchParams.access ?? "",
  });

  if (resolvedSearchParams.anchorDate) {
    query.set("anchorDate", resolvedSearchParams.anchorDate);
  }
  if (resolvedSearchParams.screen) {
    query.set("screen", resolvedSearchParams.screen);
  }
  if (resolvedSearchParams.label) {
    query.set("label", resolvedSearchParams.label);
  }

  redirect(`/display/playlists/${playlist.slug}?${query.toString()}`);
}
