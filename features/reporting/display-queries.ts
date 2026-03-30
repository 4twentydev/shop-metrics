import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  departments,
  displayPlaylistItems,
  displayPlaylists,
  displayScreenHeartbeats,
  reportTemplates,
  shifts,
} from "@/lib/db/schema";

export async function getDisplayPlaylists() {
  const playlists = await db
    .select({
      id: displayPlaylists.id,
      name: displayPlaylists.name,
      slug: displayPlaylists.slug,
      description: displayPlaylists.description,
      rotationSeconds: displayPlaylists.rotationSeconds,
      heartbeatIntervalSeconds: displayPlaylists.heartbeatIntervalSeconds,
      departmentCode: departments.code,
      shiftCode: shifts.code,
      startsAtLocal: displayPlaylists.startsAtLocal,
      endsAtLocal: displayPlaylists.endsAtLocal,
      isActive: displayPlaylists.isActive,
    })
    .from(displayPlaylists)
    .leftJoin(departments, eq(displayPlaylists.departmentId, departments.id))
    .leftJoin(shifts, eq(displayPlaylists.shiftId, shifts.id))
    .orderBy(asc(displayPlaylists.name));

  const items = await db
    .select({
      playlistId: displayPlaylistItems.playlistId,
      templateId: reportTemplates.id,
      templateName: reportTemplates.name,
      templateSlug: reportTemplates.slug,
      position: displayPlaylistItems.position,
    })
    .from(displayPlaylistItems)
    .innerJoin(reportTemplates, eq(displayPlaylistItems.templateId, reportTemplates.id))
    .where(isNull(reportTemplates.deletedAt))
    .orderBy(asc(displayPlaylistItems.position));

  return playlists.map((playlist) => ({
    ...playlist,
    items: items.filter((item) => item.playlistId === playlist.id),
  }));
}

export async function getDisplayPlaylistBySlug(
  slug: string,
  options?: {
    includeInactive?: boolean;
  },
) {
  const playlist = await db.query.displayPlaylists.findFirst({
    where:
      options?.includeInactive
        ? eq(displayPlaylists.slug, slug)
        : and(eq(displayPlaylists.slug, slug), eq(displayPlaylists.isActive, true)),
  });

  if (!playlist) {
    return null;
  }

  const items = await db
    .select({
      id: displayPlaylistItems.id,
      position: displayPlaylistItems.position,
      templateId: reportTemplates.id,
      templateName: reportTemplates.name,
      templateSlug: reportTemplates.slug,
      viewType: reportTemplates.viewType,
      defaultWindowType: reportTemplates.defaultWindowType,
      scopeKey: reportTemplates.scopeKey,
    })
    .from(displayPlaylistItems)
    .innerJoin(reportTemplates, eq(displayPlaylistItems.templateId, reportTemplates.id))
    .where(
      and(
        eq(displayPlaylistItems.playlistId, playlist.id),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(asc(displayPlaylistItems.position));

  return {
    ...playlist,
    items,
  };
}

export async function getScheduledDisplayPlaylist(input: {
  departmentCode?: string | null;
  shiftCode?: string | null;
}) {
  const rows = await db
    .select({
      id: displayPlaylists.id,
      name: displayPlaylists.name,
      slug: displayPlaylists.slug,
      description: displayPlaylists.description,
      rotationSeconds: displayPlaylists.rotationSeconds,
      heartbeatIntervalSeconds: displayPlaylists.heartbeatIntervalSeconds,
      departmentCode: departments.code,
      shiftCode: shifts.code,
      startsAtLocal: displayPlaylists.startsAtLocal,
      endsAtLocal: displayPlaylists.endsAtLocal,
      isActive: displayPlaylists.isActive,
    })
    .from(displayPlaylists)
    .leftJoin(departments, eq(displayPlaylists.departmentId, departments.id))
    .leftJoin(shifts, eq(displayPlaylists.shiftId, shifts.id))
    .where(eq(displayPlaylists.isActive, true))
    .orderBy(
      asc(displayPlaylists.departmentId),
      asc(displayPlaylists.shiftId),
      asc(displayPlaylists.name),
    );

  const departmentMatch =
    rows.find(
      (row) =>
        row.departmentCode === (input.departmentCode ?? null) &&
        row.shiftCode === (input.shiftCode ?? null),
    ) ??
    rows.find(
      (row) =>
        row.departmentCode === (input.departmentCode ?? null) && row.shiftCode === null,
    ) ??
    rows.find(
      (row) =>
        row.departmentCode === null && row.shiftCode === (input.shiftCode ?? null),
    ) ??
    rows.find((row) => row.departmentCode === null && row.shiftCode === null);

  return departmentMatch ?? null;
}

export async function getDisplayHeartbeatAdminData() {
  const heartbeats = await db
    .select({
      id: displayScreenHeartbeats.id,
      screenKey: displayScreenHeartbeats.screenKey,
      screenLabel: displayScreenHeartbeats.screenLabel,
      lastTemplateSlug: displayScreenHeartbeats.lastTemplateSlug,
      lastPath: displayScreenHeartbeats.lastPath,
      lastAnchorDate: displayScreenHeartbeats.lastAnchorDate,
      lastSeenAt: displayScreenHeartbeats.lastSeenAt,
      playlistName: displayPlaylists.name,
      heartbeatIntervalSeconds: displayPlaylists.heartbeatIntervalSeconds,
    })
    .from(displayScreenHeartbeats)
    .leftJoin(displayPlaylists, eq(displayScreenHeartbeats.playlistId, displayPlaylists.id))
    .orderBy(desc(displayScreenHeartbeats.lastSeenAt))
    .limit(20);

  const now = Date.now();

  return heartbeats.map((heartbeat) => ({
    ...heartbeat,
    isStale:
      now - heartbeat.lastSeenAt.getTime() >
      ((heartbeat.heartbeatIntervalSeconds ?? 60) * 2 + 30) * 1000,
  }));
}
