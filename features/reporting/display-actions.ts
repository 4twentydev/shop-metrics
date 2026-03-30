"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  displayPlaylistItems,
  displayPlaylists,
  reportTemplates,
} from "@/lib/db/schema";

import { optionalString } from "./schemas";
import { displayPlaylistSchema } from "./schemas";

async function resolveTemplateIds(slugs: string[]) {
  if (slugs.length === 0) {
    return [];
  }

  const templates = await Promise.all(
    slugs.map((slug) =>
      db.query.reportTemplates.findFirst({
        where: and(
          eq(reportTemplates.slug, slug),
          eq(reportTemplates.isPinned, true),
          isNull(reportTemplates.deletedAt),
        ),
      }),
    ),
  );

  const missing = slugs.filter((_, index) => !templates[index]);
  if (missing.length > 0) {
    throw new Error(`Pinned templates not found: ${missing.join(", ")}`);
  }

  return templates.map((template) => template!.id);
}

export async function saveDisplayPlaylistAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = displayPlaylistSchema.parse({
    playlistId: optionalString(formData, "playlistId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: optionalString(formData, "description"),
    rotationSeconds: formData.get("rotationSeconds"),
    heartbeatIntervalSeconds: formData.get("heartbeatIntervalSeconds"),
    isActive: formData.get("isActive") === "on",
    templateSlugs: formData.get("templateSlugs"),
  });

  const templateSlugs = parsed.templateSlugs
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const templateIds = await resolveTemplateIds(templateSlugs);

  if (parsed.playlistId) {
    const previous = await db.query.displayPlaylists.findFirst({
      where: eq(displayPlaylists.id, parsed.playlistId),
    });

    await db
      .update(displayPlaylists)
      .set({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        rotationSeconds: parsed.rotationSeconds,
        heartbeatIntervalSeconds: parsed.heartbeatIntervalSeconds,
        isActive: parsed.isActive,
        updatedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(displayPlaylists.id, parsed.playlistId));

    await db
      .delete(displayPlaylistItems)
      .where(eq(displayPlaylistItems.playlistId, parsed.playlistId));

    if (templateIds.length > 0) {
      await db.insert(displayPlaylistItems).values(
        templateIds.map((templateId, index) => ({
          playlistId: parsed.playlistId!,
          templateId,
          position: index,
        })),
      );
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "display-playlist.updated",
      entityType: "display_playlist",
      entityId: parsed.playlistId,
      beforeState: previous ?? null,
      afterState: {
        slug: parsed.slug,
        templateSlugs,
      },
    });
  } else {
    const inserted = await db
      .insert(displayPlaylists)
      .values({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        rotationSeconds: parsed.rotationSeconds,
        heartbeatIntervalSeconds: parsed.heartbeatIntervalSeconds,
        isActive: parsed.isActive,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
      })
      .returning({ id: displayPlaylists.id });

    if (templateIds.length > 0) {
      await db.insert(displayPlaylistItems).values(
        templateIds.map((templateId, index) => ({
          playlistId: inserted[0]!.id,
          templateId,
          position: index,
        })),
      );
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "display-playlist.created",
      entityType: "display_playlist",
      entityId: inserted[0]!.id,
      afterState: {
        slug: parsed.slug,
        templateSlugs,
      },
    });
  }

  revalidatePath("/ops/reports/admin");
}

export async function deleteDisplayPlaylistAction(formData: FormData) {
  const session = await requireOpsRole();
  const playlistId = String(formData.get("playlistId") ?? "");

  const existing = await db.query.displayPlaylists.findFirst({
    where: eq(displayPlaylists.id, playlistId),
  });

  if (!existing) {
    throw new Error("Display playlist not found.");
  }

  await db.delete(displayPlaylists).where(eq(displayPlaylists.id, playlistId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "display-playlist.deleted",
    entityType: "display_playlist",
    entityId: playlistId,
    beforeState: existing,
  });

  revalidatePath("/ops/reports/admin");
}
