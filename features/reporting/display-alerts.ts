import "server-only";

import { desc, eq } from "drizzle-orm";

import {
  resolveNotificationRecipients,
  sendEmailNotification,
  shouldSendNotification,
} from "@/features/governance/notifications";
import { db } from "@/lib/db";
import {
  displayAlerts,
  displayScreenHeartbeats,
  notificationDeliveries,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function syncDisplayAlerts() {
  const heartbeats = await db.query.displayScreenHeartbeats.findMany({
    orderBy: [desc(displayScreenHeartbeats.lastSeenAt)],
  });

  const activeAlerts = await db.query.displayAlerts.findMany({
    where: eq(displayAlerts.status, "ACTIVE"),
  });

  const now = Date.now();

  for (const heartbeat of heartbeats) {
    const intervalSeconds =
      Number(
        (heartbeat.metadata as { heartbeatIntervalSeconds?: number } | null)
          ?.heartbeatIntervalSeconds ?? 60,
      ) || 60;
    const isStale =
      now - heartbeat.lastSeenAt.getTime() > (intervalSeconds * 2 + 30) * 1000;
    const existing = activeAlerts.find(
      (alert) => alert.screenHeartbeatId === heartbeat.id,
    );

    if (isStale && !existing) {
      const inserted = await db
        .insert(displayAlerts)
        .values({
          playlistId: heartbeat.playlistId ?? null,
          screenHeartbeatId: heartbeat.id,
          alertType: "STALE_HEARTBEAT",
          status: "ACTIVE",
          message: `Display ${heartbeat.screenLabel ?? heartbeat.screenKey} heartbeat is stale.`,
          detectedAt: new Date(),
          lastEvaluatedAt: new Date(),
          metadata: {
            screenKey: heartbeat.screenKey,
            playlistId: heartbeat.playlistId,
            lastSeenAt: heartbeat.lastSeenAt,
          },
        })
        .returning({ id: displayAlerts.id, message: displayAlerts.message });

      const recipients = await resolveNotificationRecipients({
        eventType: "DISPLAY_STALE_HEARTBEAT",
        channel: "EMAIL",
      });

      for (const recipient of recipients) {
        const shouldSend = await shouldSendNotification({
          eventType: "DISPLAY_STALE_HEARTBEAT",
          channel: "EMAIL",
          recipient: recipient.email,
          displayAlertId: inserted[0]!.id,
          repeatMinutes: recipient.repeatMinutes,
        });

        if (!shouldSend) {
          continue;
        }

        const delivery = await db
          .insert(notificationDeliveries)
          .values({
            eventType: "DISPLAY_STALE_HEARTBEAT",
            displayAlertId: inserted[0]!.id,
            channel: "EMAIL",
            recipient: recipient.email,
            status: "PENDING",
            provider: "pending",
            metadata: {
              escalationOrder: recipient.escalationOrder,
            },
          })
          .returning({ id: notificationDeliveries.id });

        try {
          const sent = await sendEmailNotification({
            recipient: recipient.email,
            subject: `Display heartbeat stale: ${heartbeat.screenLabel ?? heartbeat.screenKey}`,
            html: `
              <p>${inserted[0]!.message}</p>
              <p><a href="${env.APP_URL}/ops/reports/display/monitoring">Open kiosk monitoring</a></p>
            `,
          });

          await db
            .update(notificationDeliveries)
            .set({
              status: "SENT",
              provider: sent.provider,
              providerMessageId: sent.providerMessageId,
              sentAt: new Date(),
            })
            .where(eq(notificationDeliveries.id, delivery[0]!.id));
        } catch (error) {
          await db
            .update(notificationDeliveries)
            .set({
              status: "FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown delivery error.",
            })
            .where(eq(notificationDeliveries.id, delivery[0]!.id));
        }
      }
    }

    if (!isStale && existing) {
      await db
        .update(displayAlerts)
        .set({
          status: "RESOLVED",
          resolvedAt: new Date(),
          lastEvaluatedAt: new Date(),
        })
        .where(eq(displayAlerts.id, existing.id));
    }

    if (isStale && existing) {
      await db
        .update(displayAlerts)
        .set({
          lastEvaluatedAt: new Date(),
          metadata: {
            ...(existing.metadata as Record<string, unknown> | null),
            lastSeenAt: heartbeat.lastSeenAt,
          },
        })
        .where(eq(displayAlerts.id, existing.id));
    }
  }
}

export async function getDisplayMonitoringPageData() {
  await syncDisplayAlerts();

  const [heartbeats, alerts] = await Promise.all([
    db.query.displayScreenHeartbeats.findMany({
      orderBy: [desc(displayScreenHeartbeats.lastSeenAt)],
    }),
    db.query.displayAlerts.findMany({
      orderBy: [desc(displayAlerts.detectedAt)],
    }),
  ]);

  const now = Date.now();

  return {
    heartbeats: heartbeats.map((heartbeat) => {
      const intervalSeconds =
        Number(
          (heartbeat.metadata as { heartbeatIntervalSeconds?: number } | null)
            ?.heartbeatIntervalSeconds ?? 60,
        ) || 60;
      return {
        ...heartbeat,
        isStale:
          now - heartbeat.lastSeenAt.getTime() > (intervalSeconds * 2 + 30) * 1000,
      };
    }),
    alerts,
  };
}
