"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  departments,
  displayPlaylistItems,
  displayPlaylists,
  reportTemplates,
  shifts,
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
    departmentCode: optionalString(formData, "departmentCode"),
    shiftCode: optionalString(formData, "shiftCode"),
    startsAtLocal: optionalString(formData, "startsAtLocal"),
    endsAtLocal: optionalString(formData, "endsAtLocal"),
    isActive: formData.get("isActive") === "on",
    templateSlugs: formData.get("templateSlugs"),
  });

  const [department, shift] = await Promise.all([
    parsed.departmentCode
      ? db.query.departments.findFirst({
          where: eq(departments.code, parsed.departmentCode),
        })
      : Promise.resolve(null),
    parsed.shiftCode
      ? db.query.shifts.findFirst({
          where: eq(shifts.code, parsed.shiftCode),
        })
      : Promise.resolve(null),
  ]);

  if (parsed.departmentCode && !department) {
    throw new Error(`Department ${parsed.departmentCode} was not found.`);
  }

  if (parsed.shiftCode && !shift) {
    throw new Error(`Shift ${parsed.shiftCode} was not found.`);
  }

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
        departmentId: department?.id ?? null,
        shiftId: shift?.id ?? null,
        startsAtLocal: parsed.startsAtLocal ?? null,
        endsAtLocal: parsed.endsAtLocal ?? null,
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
        departmentCode: parsed.departmentCode,
        shiftCode: parsed.shiftCode,
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
        departmentId: department?.id ?? null,
        shiftId: shift?.id ?? null,
        startsAtLocal: parsed.startsAtLocal ?? null,
        endsAtLocal: parsed.endsAtLocal ?? null,
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
        departmentCode: parsed.departmentCode,
        shiftCode: parsed.shiftCode,
      },
    });
  }

  revalidatePath("/ops/reports/admin");
  revalidatePath("/ops/reports/display");
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
  revalidatePath("/ops/reports/display");
}
