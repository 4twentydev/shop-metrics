import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { reportExportArtifacts, reportExportDeliveries } from "@/lib/db/schema";

export function calculateExpiry(input: { deliveredAt: Date; retentionDays: number }) {
  return new Date(
    input.deliveredAt.getTime() + input.retentionDays * 24 * 60 * 60 * 1000,
  );
}

export async function expireAndCleanupReportArtifacts() {
  const now = new Date();
  const expiredDeliveries = await db
    .select()
    .from(reportExportDeliveries)
    .where(
      and(
        lte(reportExportDeliveries.expiresAt, now),
        eq(reportExportDeliveries.cleanupStatus, "ACTIVE"),
      ),
    );

  for (const delivery of expiredDeliveries) {
    await db
      .update(reportExportDeliveries)
      .set({
        cleanupStatus: "EXPIRED",
      })
      .where(eq(reportExportDeliveries.id, delivery.id));

    await db
      .update(reportExportArtifacts)
      .set({
        cleanupStatus: "EXPIRED",
      })
      .where(eq(reportExportArtifacts.deliveryId, delivery.id));
  }

  return {
    expiredCount: expiredDeliveries.length,
  };
}
