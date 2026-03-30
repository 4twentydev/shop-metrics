"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  notificationEscalationPolicies,
  notificationPreferences,
} from "@/lib/db/schema";

import {
  escalationPolicySchema,
  notificationPreferenceSchema,
} from "./schemas";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function saveNotificationPreferenceAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = notificationPreferenceSchema.parse({
    preferenceId: optionalString(formData, "preferenceId"),
    userId: formData.get("userId"),
    eventType: formData.get("eventType"),
    channel: formData.get("channel"),
    isEnabled: formData.get("isEnabled") === "on",
    minimumRepeatMinutes: formData.get("minimumRepeatMinutes"),
  });

  if (parsed.preferenceId) {
    await db
      .update(notificationPreferences)
      .set({
        userId: parsed.userId,
        eventType: parsed.eventType,
        channel: parsed.channel,
        isEnabled: parsed.isEnabled,
        minimumRepeatMinutes: parsed.minimumRepeatMinutes,
        updatedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, parsed.preferenceId));
  } else {
    await db.insert(notificationPreferences).values({
      userId: parsed.userId,
      eventType: parsed.eventType,
      channel: parsed.channel,
      isEnabled: parsed.isEnabled,
      minimumRepeatMinutes: parsed.minimumRepeatMinutes,
      updatedByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "notification-preference.saved",
    entityType: "notification_preference",
    entityId: parsed.preferenceId ?? parsed.userId,
    metadata: parsed,
  });

  revalidatePath("/ops/reports/admin");
}

export async function saveEscalationPolicyAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = escalationPolicySchema.parse({
    policyId: optionalString(formData, "policyId"),
    eventType: formData.get("eventType"),
    channel: formData.get("channel"),
    roleSlug: formData.get("roleSlug"),
    escalationOrder: formData.get("escalationOrder"),
    repeatMinutes: formData.get("repeatMinutes"),
    isActive: formData.get("isActive") === "on",
  });

  if (parsed.policyId) {
    await db
      .update(notificationEscalationPolicies)
      .set({
        eventType: parsed.eventType,
        channel: parsed.channel,
        roleSlug: parsed.roleSlug,
        escalationOrder: parsed.escalationOrder,
        repeatMinutes: parsed.repeatMinutes,
        isActive: parsed.isActive,
        updatedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(notificationEscalationPolicies.id, parsed.policyId));
  } else {
    await db.insert(notificationEscalationPolicies).values({
      eventType: parsed.eventType,
      channel: parsed.channel,
      roleSlug: parsed.roleSlug,
      escalationOrder: parsed.escalationOrder,
      repeatMinutes: parsed.repeatMinutes,
      isActive: parsed.isActive,
      createdByUserId: session.user.id,
      updatedByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "notification-policy.saved",
    entityType: "notification_escalation_policy",
    entityId: parsed.policyId ?? parsed.roleSlug,
    metadata: parsed,
  });

  revalidatePath("/ops/reports/admin");
}
