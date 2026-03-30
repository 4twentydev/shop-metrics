import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  jobs,
  releaseExtractionRuns,
  releaseIntakeBatches,
  users,
} from "@/lib/db/schema";

export async function getExtractionReviewPageData() {
  const releases = await db
    .select({
      releaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      revisionCode: jobReleases.revisionCode,
      panelBaseline: jobReleases.panelBaseline,
      baselineApprovedAt: jobReleases.baselineApprovedAt,
      baselineStaleAt: jobReleases.baselineStaleAt,
      baselineStaleReason: jobReleases.baselineStaleReason,
      baselineApprovedExtractionRunId: jobReleases.baselineApprovedExtractionRunId,
      jobNumber: jobs.jobNumber,
      productName: jobs.productName,
      customerName: jobs.customerName,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .orderBy(jobs.jobNumber, jobReleases.releaseCode);

  const releaseIds = releases.map((release) => release.releaseId);

  const batches =
    releaseIds.length > 0
      ? await db
          .select({
            id: releaseIntakeBatches.id,
            jobReleaseId: releaseIntakeBatches.jobReleaseId,
            uploadLabel: releaseIntakeBatches.uploadLabel,
            status: releaseIntakeBatches.status,
            extractionHandoffAt: releaseIntakeBatches.extractionHandoffAt,
            affectsApprovedBaseline: releaseIntakeBatches.affectsApprovedBaseline,
          })
          .from(releaseIntakeBatches)
          .where(inArray(releaseIntakeBatches.jobReleaseId, releaseIds))
          .orderBy(desc(releaseIntakeBatches.createdAt))
      : [];

  const documents =
    releaseIds.length > 0
      ? await db
          .select({
            id: jobDocuments.id,
            jobReleaseId: jobDocuments.jobReleaseId,
            intakeBatchId: jobDocuments.intakeBatchId,
            fileName: jobDocuments.fileName,
            kind: jobDocuments.kind,
            documentFamily: jobDocuments.documentFamily,
            isCurrent: jobDocuments.isCurrent,
            extractionStatus: jobDocuments.extractionStatus,
          })
          .from(jobDocuments)
          .where(inArray(jobDocuments.jobReleaseId, releaseIds))
          .orderBy(desc(jobDocuments.uploadedAt))
      : [];

  const runs =
    releaseIds.length > 0
      ? await db
          .select({
            id: releaseExtractionRuns.id,
            jobReleaseId: releaseExtractionRuns.jobReleaseId,
            intakeBatchId: releaseExtractionRuns.intakeBatchId,
            provider: releaseExtractionRuns.provider,
            model: releaseExtractionRuns.model,
            status: releaseExtractionRuns.status,
            reviewStatus: releaseExtractionRuns.reviewStatus,
            attemptNumber: releaseExtractionRuns.attemptNumber,
            confidence: releaseExtractionRuns.confidence,
            normalizedOutput: releaseExtractionRuns.normalizedOutput,
            reviewedOutput: releaseExtractionRuns.reviewedOutput,
            errorMessage: releaseExtractionRuns.errorMessage,
            reviewerNotes: releaseExtractionRuns.reviewerNotes,
            startedAt: releaseExtractionRuns.startedAt,
            completedAt: releaseExtractionRuns.completedAt,
            approvedAt: releaseExtractionRuns.approvedAt,
            createdByName: users.name,
          })
          .from(releaseExtractionRuns)
          .leftJoin(users, eq(releaseExtractionRuns.createdByUserId, users.id))
          .where(inArray(releaseExtractionRuns.jobReleaseId, releaseIds))
          .orderBy(desc(releaseExtractionRuns.createdAt))
      : [];

  return {
    releases: releases.map((release) => ({
      ...release,
      batches: batches.filter((batch) => batch.jobReleaseId === release.releaseId),
      documents: documents.filter(
        (document) => document.jobReleaseId === release.releaseId,
      ),
      runs: runs.filter((run) => run.jobReleaseId === release.releaseId),
    })),
  };
}

export type ExtractionReviewPageData = Awaited<
  ReturnType<typeof getExtractionReviewPageData>
>;
