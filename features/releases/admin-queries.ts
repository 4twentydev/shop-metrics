import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  jobs,
  releaseExtractionRuns,
  shiftSubmissions,
  workEntries,
} from "@/lib/db/schema";

export async function getReleaseAdminPageData() {
  const releases = await db
    .select({
      releaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      revisionCode: jobReleases.revisionCode,
      releaseStatus: jobReleases.status,
      partFamily: jobReleases.partFamily,
      panelBaseline: jobReleases.panelBaseline,
      baselineApprovedAt: jobReleases.baselineApprovedAt,
      baselineStaleAt: jobReleases.baselineStaleAt,
      baselineStaleReason: jobReleases.baselineStaleReason,
      baselineApprovedExtractionRunId: jobReleases.baselineApprovedExtractionRunId,
      notes: jobReleases.notes,
      dueDate: jobReleases.dueDate,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      productName: jobs.productName,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .orderBy(jobs.jobNumber, jobReleases.releaseCode);

  const releaseIds = releases.map((release) => release.releaseId);

  const currentDocumentCounts =
    releaseIds.length > 0
      ? await db
          .select({
            jobReleaseId: jobDocuments.jobReleaseId,
            currentCount: sql<number>`count(*)`,
          })
          .from(jobDocuments)
          .where(
            and(
              inArray(jobDocuments.jobReleaseId, releaseIds),
              eq(jobDocuments.isCurrent, true),
            ),
          )
          .groupBy(jobDocuments.jobReleaseId)
      : [];

  const extractionRuns =
    releaseIds.length > 0
      ? await db
          .select({
            jobReleaseId: releaseExtractionRuns.jobReleaseId,
            runId: releaseExtractionRuns.id,
            status: releaseExtractionRuns.status,
            reviewStatus: releaseExtractionRuns.reviewStatus,
            approvedAt: releaseExtractionRuns.approvedAt,
          })
          .from(releaseExtractionRuns)
          .where(inArray(releaseExtractionRuns.jobReleaseId, releaseIds))
          .orderBy(desc(releaseExtractionRuns.createdAt))
      : [];

  const workEntryCounts =
    releaseIds.length > 0
      ? await db
          .select({
            jobReleaseId: workEntries.jobReleaseId,
            entryCount: sql<number>`count(*)`,
            lockedCount: sql<number>`sum(case when ${workEntries.isLocked} then 1 else 0 end)`,
          })
          .from(workEntries)
          .where(inArray(workEntries.jobReleaseId, releaseIds))
          .groupBy(workEntries.jobReleaseId)
      : [];

  const submissionCounts =
    releaseIds.length > 0
      ? await db
          .select({
            jobReleaseId: workEntries.jobReleaseId,
            submissionCount: sql<number>`count(distinct ${shiftSubmissions.id})`,
          })
          .from(workEntries)
          .innerJoin(shiftSubmissions, eq(workEntries.submissionId, shiftSubmissions.id))
          .where(inArray(workEntries.jobReleaseId, releaseIds))
          .groupBy(workEntries.jobReleaseId)
      : [];

  return {
    releases: releases.map((release) => {
      const currentDocCount =
        currentDocumentCounts.find((row) => row.jobReleaseId === release.releaseId)
          ?.currentCount ?? 0;
      const latestRun =
        extractionRuns.find((row) => row.jobReleaseId === release.releaseId) ?? null;
      const workEntryCount =
        workEntryCounts.find((row) => row.jobReleaseId === release.releaseId)?.entryCount ??
        0;
      const lockedEntryCount =
        workEntryCounts.find((row) => row.jobReleaseId === release.releaseId)?.lockedCount ??
        0;
      const submissionCount =
        submissionCounts.find((row) => row.jobReleaseId === release.releaseId)
          ?.submissionCount ?? 0;

      const readinessIssues = [
        !release.baselineApprovedAt ? "No approved baseline" : null,
        release.baselineStaleAt ? "Baseline marked stale" : null,
        currentDocCount === 0 ? "No current document set" : null,
        latestRun && latestRun.status === "FAILED" ? "Latest extraction failed" : null,
      ].filter(Boolean) as string[];

      const workEntryAvailable =
        readinessIssues.length === 0 &&
        ["READY", "IN_PRODUCTION"].includes(release.releaseStatus);

      return {
        ...release,
        currentDocCount,
        latestRun,
        workEntryCount,
        lockedEntryCount,
        submissionCount,
        readinessIssues,
        workEntryAvailable,
      };
    }),
  };
}

export async function getReleaseAdminDetail(releaseId: string) {
  const pageData = await getReleaseAdminPageData();
  const release = pageData.releases.find((item) => item.releaseId === releaseId) ?? null;

  if (!release) {
    return null;
  }

  const [documents, runs] = await Promise.all([
    db
      .select({
        id: jobDocuments.id,
        fileName: jobDocuments.fileName,
        kind: jobDocuments.kind,
        documentFamily: jobDocuments.documentFamily,
        revisionNumber: jobDocuments.revisionNumber,
        isCurrent: jobDocuments.isCurrent,
        supersedeDecision: jobDocuments.supersedeDecision,
        extractionStatus: jobDocuments.extractionStatus,
        uploadedAt: jobDocuments.uploadedAt,
      })
      .from(jobDocuments)
      .where(eq(jobDocuments.jobReleaseId, releaseId))
      .orderBy(desc(jobDocuments.uploadedAt)),
    db
      .select({
        id: releaseExtractionRuns.id,
        status: releaseExtractionRuns.status,
        reviewStatus: releaseExtractionRuns.reviewStatus,
        confidence: releaseExtractionRuns.confidence,
        errorMessage: releaseExtractionRuns.errorMessage,
        approvedAt: releaseExtractionRuns.approvedAt,
        completedAt: releaseExtractionRuns.completedAt,
        attemptNumber: releaseExtractionRuns.attemptNumber,
      })
      .from(releaseExtractionRuns)
      .where(eq(releaseExtractionRuns.jobReleaseId, releaseId))
      .orderBy(desc(releaseExtractionRuns.createdAt)),
  ]);

  return {
    release,
    documents,
    runs,
  };
}

export type ReleaseAdminPageData = Awaited<
  ReturnType<typeof getReleaseAdminPageData>
>;
