import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { deliverReadinessNotifications } from "@/features/releases/notification-delivery";
import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  jobs,
  releaseExtractionRuns,
  releaseReadinessNotifications,
} from "@/lib/db/schema";

type ReadinessSignal = {
  jobReleaseId: string;
  jobNumber: string;
  releaseCode: string;
  baselineStaleAt: Date | null;
  latestRunStatus: string | null;
  currentDocumentCount: number;
};

function buildNotificationCandidates(signal: ReadinessSignal) {
  const base = {
    jobReleaseId: signal.jobReleaseId,
    metadata: {
      jobNumber: signal.jobNumber,
      releaseCode: signal.releaseCode,
      currentDocumentCount: signal.currentDocumentCount,
      latestRunStatus: signal.latestRunStatus,
    },
  };

  return [
    signal.baselineStaleAt
      ? {
          ...base,
          notificationType: "STALE_BASELINE" as const,
          message: `Release ${signal.releaseCode} on job ${signal.jobNumber} is blocked because the approved baseline is stale.`,
        }
      : null,
    signal.latestRunStatus === "FAILED"
      ? {
          ...base,
          notificationType: "FAILED_EXTRACTION" as const,
          message: `Release ${signal.releaseCode} on job ${signal.jobNumber} is blocked because the latest extraction run failed.`,
        }
      : null,
  ].filter(Boolean) as Array<{
    jobReleaseId: string;
    notificationType: "STALE_BASELINE" | "FAILED_EXTRACTION";
    message: string;
    metadata: Record<string, unknown>;
  }>;
}

export async function syncReleaseReadinessNotifications() {
  const releaseRows = await db
    .select({
      jobReleaseId: jobReleases.id,
      jobNumber: jobs.jobNumber,
      releaseCode: jobReleases.releaseCode,
      baselineStaleAt: jobReleases.baselineStaleAt,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id));

  const releaseIds = releaseRows.map((row) => row.jobReleaseId);

  const [latestRuns, currentDocs] = await Promise.all([
    releaseIds.length > 0
      ? db
          .select({
            jobReleaseId: releaseExtractionRuns.jobReleaseId,
            status: releaseExtractionRuns.status,
          })
          .from(releaseExtractionRuns)
          .where(inArray(releaseExtractionRuns.jobReleaseId, releaseIds))
          .orderBy(desc(releaseExtractionRuns.createdAt))
      : Promise.resolve([]),
    releaseIds.length > 0
      ? db
          .select({
            jobReleaseId: jobDocuments.jobReleaseId,
            documentId: jobDocuments.id,
          })
          .from(jobDocuments)
          .where(
            and(
              inArray(jobDocuments.jobReleaseId, releaseIds),
              eq(jobDocuments.isCurrent, true),
            ),
          )
      : Promise.resolve([]),
  ]);

  const grouped = releaseRows.map((row) => ({
    jobReleaseId: row.jobReleaseId,
    jobNumber: row.jobNumber,
    releaseCode: row.releaseCode,
    baselineStaleAt: row.baselineStaleAt,
    latestRunStatus:
      latestRuns.find((run) => run.jobReleaseId === row.jobReleaseId)?.status ?? null,
    currentDocumentCount: currentDocs.filter(
      (document) => document.jobReleaseId === row.jobReleaseId,
    ).length,
  }));

  const active = await db
    .select()
    .from(releaseReadinessNotifications)
    .where(eq(releaseReadinessNotifications.status, "ACTIVE"));

  for (const signal of grouped) {
    const desired = buildNotificationCandidates(signal);
    const activeForRelease = active.filter(
      (notification) => notification.jobReleaseId === signal.jobReleaseId,
    );

    for (const desiredNotification of desired) {
      const existing = activeForRelease.find(
        (notification) =>
          notification.notificationType === desiredNotification.notificationType,
      );

      if (existing) {
        await db
          .update(releaseReadinessNotifications)
          .set({
            message: desiredNotification.message,
            metadata: desiredNotification.metadata,
            lastEvaluatedAt: new Date(),
          })
          .where(eq(releaseReadinessNotifications.id, existing.id));
      } else {
        await db.insert(releaseReadinessNotifications).values({
          jobReleaseId: desiredNotification.jobReleaseId,
          notificationType: desiredNotification.notificationType,
          message: desiredNotification.message,
          metadata: desiredNotification.metadata,
          status: "ACTIVE",
          detectedAt: new Date(),
          lastEvaluatedAt: new Date(),
        });
      }
    }

    const desiredTypes = new Set(desired.map((item) => item.notificationType));
    const toResolve = activeForRelease.filter(
      (notification) => !desiredTypes.has(notification.notificationType),
    );

    for (const notification of toResolve) {
      await db
        .update(releaseReadinessNotifications)
        .set({
          status: "RESOLVED",
          resolvedAt: new Date(),
          lastEvaluatedAt: new Date(),
        })
        .where(eq(releaseReadinessNotifications.id, notification.id));
    }
  }

  await deliverReadinessNotifications();
}

export async function getActiveReadinessNotifications() {
  const rows = await db
    .select({
      id: releaseReadinessNotifications.id,
      message: releaseReadinessNotifications.message,
      notificationType: releaseReadinessNotifications.notificationType,
      detectedAt: releaseReadinessNotifications.detectedAt,
      jobReleaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      jobNumber: jobs.jobNumber,
    })
    .from(releaseReadinessNotifications)
    .innerJoin(jobReleases, eq(releaseReadinessNotifications.jobReleaseId, jobReleases.id))
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .where(eq(releaseReadinessNotifications.status, "ACTIVE"))
    .orderBy(desc(releaseReadinessNotifications.detectedAt));

  return rows;
}
