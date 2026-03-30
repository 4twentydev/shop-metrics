"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { metricTargetVersions, metricTargets } from "@/lib/db/schema";

import { metricScopeSchema, metricWindowSchema } from "./schemas";
import { z } from "zod";

const targetFormSchema = z.object({
  targetId: z.string().uuid().nullable().optional(),
  windowType: metricWindowSchema,
  scopeType: metricScopeSchema,
  scopeReferenceId: z.string().uuid().nullable().optional(),
  scopeKey: z.string().trim().max(128).nullable().optional(),
  metricKey: z.string().trim().min(1).max(96),
  targetValue: z.coerce.number().nonnegative(),
  unitLabel: z.string().trim().min(1).max(48),
  effectiveStart: z.string().date(),
  effectiveEnd: z.string().date().nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function writeMetricTargetVersion(input: {
  metricTargetId: string;
  changeAction: "CREATED" | "UPDATED" | "SOFT_DELETED" | "RESTORED";
  snapshot: Record<string, unknown>;
  changedByUserId: string;
}) {
  await db.insert(metricTargetVersions).values({
    metricTargetId: input.metricTargetId,
    changeAction: input.changeAction,
    snapshot: input.snapshot,
    changedByUserId: input.changedByUserId,
  });
}

export async function saveMetricTargetAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = targetFormSchema.parse({
    targetId: optionalString(formData, "targetId"),
    windowType: formData.get("windowType"),
    scopeType: formData.get("scopeType"),
    scopeReferenceId: optionalString(formData, "scopeReferenceId"),
    scopeKey: optionalString(formData, "scopeKey"),
    metricKey: formData.get("metricKey"),
    targetValue: formData.get("targetValue"),
    unitLabel: formData.get("unitLabel"),
    effectiveStart: formData.get("effectiveStart"),
    effectiveEnd: optionalString(formData, "effectiveEnd"),
    notes: optionalString(formData, "notes"),
  });

  if (parsed.targetId) {
    const previous = await db.query.metricTargets.findFirst({
      where: eq(metricTargets.id, parsed.targetId),
    });

    await db
      .update(metricTargets)
      .set({
        windowType: parsed.windowType,
        scopeType: parsed.scopeType,
        scopeReferenceId: parsed.scopeReferenceId ?? null,
        scopeKey: parsed.scopeKey ?? null,
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue.toFixed(2),
        unitLabel: parsed.unitLabel,
        effectiveStart: parsed.effectiveStart,
        effectiveEnd: parsed.effectiveEnd ?? null,
        notes: parsed.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(metricTargets.id, parsed.targetId));

    await writeMetricTargetVersion({
      metricTargetId: parsed.targetId,
      changeAction: "UPDATED",
      snapshot: {
        ...previous,
        windowType: parsed.windowType,
        scopeType: parsed.scopeType,
        scopeReferenceId: parsed.scopeReferenceId ?? null,
        scopeKey: parsed.scopeKey ?? null,
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue,
        unitLabel: parsed.unitLabel,
        effectiveStart: parsed.effectiveStart,
        effectiveEnd: parsed.effectiveEnd ?? null,
        notes: parsed.notes ?? null,
      },
      changedByUserId: session.user.id,
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "metric-target.updated",
      entityType: "metric_target",
      entityId: parsed.targetId,
      beforeState: previous ?? null,
      afterState: {
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue,
      },
    });
  } else {
    const inserted = await db
      .insert(metricTargets)
      .values({
        windowType: parsed.windowType,
        scopeType: parsed.scopeType,
        scopeReferenceId: parsed.scopeReferenceId ?? null,
        scopeKey: parsed.scopeKey ?? null,
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue.toFixed(2),
        unitLabel: parsed.unitLabel,
        effectiveStart: parsed.effectiveStart,
        effectiveEnd: parsed.effectiveEnd ?? null,
        notes: parsed.notes ?? null,
        enteredByUserId: session.user.id,
      })
      .returning({ id: metricTargets.id });

    await writeMetricTargetVersion({
      metricTargetId: inserted[0]!.id,
      changeAction: "CREATED",
      snapshot: {
        windowType: parsed.windowType,
        scopeType: parsed.scopeType,
        scopeReferenceId: parsed.scopeReferenceId ?? null,
        scopeKey: parsed.scopeKey ?? null,
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue,
        unitLabel: parsed.unitLabel,
        effectiveStart: parsed.effectiveStart,
        effectiveEnd: parsed.effectiveEnd ?? null,
        notes: parsed.notes ?? null,
      },
      changedByUserId: session.user.id,
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "metric-target.created",
      entityType: "metric_target",
      entityId: inserted[0]!.id,
      afterState: {
        metricKey: parsed.metricKey,
        targetValue: parsed.targetValue,
      },
    });
  }

  revalidatePath("/ops/reports/admin");
}

export async function deleteMetricTargetAction(formData: FormData) {
  const session = await requireOpsRole();
  const targetId = String(formData.get("targetId") ?? "");
  const deletionReason = optionalString(formData, "deletionReason");

  const existing = await db.query.metricTargets.findFirst({
    where: eq(metricTargets.id, targetId),
  });

  if (!existing) {
    throw new Error("Target not found.");
  }

  await db
    .update(metricTargets)
    .set({
      deletedAt: new Date(),
      deletedByUserId: session.user.id,
      deletionReason,
      updatedAt: new Date(),
    })
    .where(eq(metricTargets.id, targetId));

  await writeMetricTargetVersion({
    metricTargetId: targetId,
    changeAction: "SOFT_DELETED",
    snapshot: {
      ...existing,
      deletionReason,
    },
    changedByUserId: session.user.id,
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "metric-target.deleted",
    entityType: "metric_target",
    entityId: targetId,
    beforeState: existing,
  });

  revalidatePath("/ops/reports/admin");
}

export async function restoreMetricTargetAction(formData: FormData) {
  const session = await requireOpsRole();
  const targetId = String(formData.get("targetId") ?? "");

  const existing = await db.query.metricTargets.findFirst({
    where: eq(metricTargets.id, targetId),
  });

  if (!existing || !existing.deletedAt) {
    throw new Error("Archived target not found.");
  }

  await db
    .update(metricTargets)
    .set({
      deletedAt: null,
      deletedByUserId: null,
      deletionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(metricTargets.id, targetId));

  await writeMetricTargetVersion({
    metricTargetId: targetId,
    changeAction: "RESTORED",
    snapshot: existing,
    changedByUserId: session.user.id,
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "metric-target.restored",
    entityType: "metric_target",
    entityId: targetId,
    beforeState: existing,
  });

  revalidatePath("/ops/reports/admin");
}
