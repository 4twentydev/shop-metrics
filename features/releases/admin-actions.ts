"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { canTransitionRelease, releaseStatusSchema } from "@/features/releases/status";
import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { jobReleases } from "@/lib/db/schema";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateReleaseAdminAction(formData: FormData) {
  const session = await requireOpsRole();
  const releaseId = String(formData.get("releaseId") ?? "");
  const nextStatus = releaseStatusSchema.parse(formData.get("status"));
  const notes = optionalString(formData, "notes");

  const existing = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.id, releaseId),
  });

  if (!existing) {
    throw new Error("Release not found.");
  }

  if (existing.status !== nextStatus && !canTransitionRelease(existing.status, nextStatus)) {
    throw new Error("Invalid release status transition.");
  }

  const nextValues = {
    status: nextStatus,
    notes,
    updatedAt: new Date(),
  } as const;

  await db.update(jobReleases).set(nextValues).where(eq(jobReleases.id, releaseId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-admin.updated",
    entityType: "job_release",
    entityId: releaseId,
    beforeState: existing,
    afterState: nextValues,
  });

  revalidatePath("/ops/releases/admin");
  revalidatePath("/ops");
}
