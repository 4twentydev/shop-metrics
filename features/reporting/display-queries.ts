import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  displayPlaylistItems,
  displayPlaylists,
  displayScreenHeartbeats,
  reportTemplates,
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
      isActive: displayPlaylists.isActive,
    })
    .from(displayPlaylists)
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

export async function getDisplayPlaylistBySlug(slug: string) {
  const playlist = await db.query.displayPlaylists.findFirst({
    where: and(eq(displayPlaylists.slug, slug), eq(displayPlaylists.isActive, true)),
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
