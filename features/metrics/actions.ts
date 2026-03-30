"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { metricTargets } from "@/lib/db/schema";

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

  const existing = await db.query.metricTargets.findFirst({
    where: eq(metricTargets.id, targetId),
  });

  if (!existing) {
    throw new Error("Target not found.");
  }

  await db.delete(metricTargets).where(eq(metricTargets.id, targetId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "metric-target.deleted",
    entityType: "metric_target",
    entityId: targetId,
    beforeState: existing,
  });

  revalidatePath("/ops/reports/admin");
}
