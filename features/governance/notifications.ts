import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/lib/db";
import {
  notificationEscalationPolicies,
  notificationPreferences,
  notificationDeliveries,
  users,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

export type NotificationEventType =
  | "STALE_BASELINE"
  | "FAILED_EXTRACTION"
  | "DISPLAY_STALE_HEARTBEAT";

export type NotificationChannel = "EMAIL" | "IN_APP";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function resolveNotificationRecipients(input: {
  eventType: NotificationEventType;
  channel: NotificationChannel;
}) {
  const policies = await db
    .select()
    .from(notificationEscalationPolicies)
    .where(
      and(
        eq(notificationEscalationPolicies.eventType, input.eventType),
        eq(notificationEscalationPolicies.channel, input.channel),
        eq(notificationEscalationPolicies.isActive, true),
      ),
    )
    .orderBy(asc(notificationEscalationPolicies.escalationOrder));

  if (policies.length === 0) {
    return [];
  }

  const policyRoleSlugs = [...new Set(policies.map((policy) => policy.roleSlug))];
  const candidates = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      activeRole: users.activeRole,
    })
    .from(users)
    .where(
      and(
        eq(users.status, "ACTIVE"),
        inArray(users.activeRole, policyRoleSlugs),
      ),
    );

  const preferences = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.eventType, input.eventType),
        eq(notificationPreferences.channel, input.channel),
        inArray(
          notificationPreferences.userId,
          candidates.map((candidate) => candidate.id),
        ),
      ),
    );

  return candidates
    .map((candidate) => {
      const policy = policies.find((item) => item.roleSlug === candidate.activeRole);
      if (!policy) {
        return null;
      }

      const preference = preferences.find((item) => item.userId === candidate.id);
      if (preference && !preference.isEnabled) {
        return null;
      }

      return {
        ...candidate,
        escalationOrder: policy.escalationOrder,
        repeatMinutes: preference?.minimumRepeatMinutes ?? policy.repeatMinutes,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left!.escalationOrder - right!.escalationOrder) as Array<{
    id: string;
    email: string;
    name: string | null;
    activeRole: string;
    escalationOrder: number;
    repeatMinutes: number;
  }>;
}

export async function shouldSendNotification(input: {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipient: string;
  readinessNotificationId?: string | null;
  displayAlertId?: string | null;
  repeatMinutes: number;
}) {
  if (input.readinessNotificationId == null && input.displayAlertId == null) {
    return true;
  }

  const previous = await db.query.notificationDeliveries.findFirst({
    where:
      input.readinessNotificationId != null
        ? and(
            eq(notificationDeliveries.eventType, input.eventType),
            eq(notificationDeliveries.channel, input.channel),
            eq(notificationDeliveries.recipient, input.recipient),
            eq(
              notificationDeliveries.readinessNotificationId,
              input.readinessNotificationId,
            ),
          )
        : and(
            eq(notificationDeliveries.eventType, input.eventType),
            eq(notificationDeliveries.channel, input.channel),
            eq(notificationDeliveries.recipient, input.recipient),
            eq(notificationDeliveries.displayAlertId, input.displayAlertId ?? ""),
          ),
    orderBy: [desc(notificationDeliveries.createdAt)],
  });

  if (!previous?.sentAt) {
    return true;
  }

  return Date.now() - previous.sentAt.getTime() >= input.repeatMinutes * 60 * 1000;
}

export async function sendEmailNotification(input: {
  recipient: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.info(`[notify] ${input.recipient}: ${input.subject}`);
    return {
      provider: "console",
      providerMessageId: null,
    };
  }

  const response = await resend.emails.send({
    from: env.AUTH_FROM_EMAIL,
    to: input.recipient,
    subject: input.subject,
    html: input.html,
  });

  return {
    provider: "resend",
    providerMessageId:
      "data" in response && response.data ? response.data.id ?? null : null,
  };
}
