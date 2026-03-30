import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { extractionQueueFilterSchema } from "@/features/extraction/schemas";
import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  jobs,
  releaseExtractionRuns,
  releaseIntakeBatches,
  users,
} from "@/lib/db/schema";

function getQueueState(input: {
  baselineStaleAt: Date | null;
  handoffReadyCount: number;
  latestRun:
    | {
        status: string;
        reviewStatus: string;
      }
    | null;
}) {
  if (input.baselineStaleAt) {
    return "STALE_BASELINE" as const;
  }

  if (input.latestRun?.status === "FAILED") {
    return "FAILED" as const;
  }

  if (
    input.latestRun?.status === "SUCCEEDED" &&
    input.latestRun.reviewStatus !== "APPROVED"
  ) {
    return "PENDING_REVIEW" as const;
  }

  if (input.handoffReadyCount > 0) {
    return "READY" as const;
  }

  if (input.latestRun?.reviewStatus === "APPROVED") {
    return "APPROVED" as const;
  }

  return "WAITING" as const;
}

export async function getExtractionReviewPageData(input?: {
  queue?: string;
}) {
  const activeQueue =
    extractionQueueFilterSchema.safeParse(input?.queue ?? "ALL").data ?? "ALL";
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
            processingMetadata: releaseExtractionRuns.processingMetadata,
            createdByName: users.name,
          })
          .from(releaseExtractionRuns)
          .leftJoin(users, eq(releaseExtractionRuns.createdByUserId, users.id))
          .where(inArray(releaseExtractionRuns.jobReleaseId, releaseIds))
          .orderBy(desc(releaseExtractionRuns.createdAt))
      : [];

  const mappedReleases = releases.map((release) => {
    const releaseBatches = batches.filter((batch) => batch.jobReleaseId === release.releaseId);
    const releaseDocuments = documents.filter(
      (document) => document.jobReleaseId === release.releaseId,
    );
    const releaseRuns = runs.filter((run) => run.jobReleaseId === release.releaseId);
    const handoffReadyCount = releaseBatches.filter(
      (batch) => batch.status === "HANDOFF_READY",
    ).length;
    const latestRun = releaseRuns[0] ?? null;
    const queueState = getQueueState({
      baselineStaleAt: release.baselineStaleAt,
      handoffReadyCount,
      latestRun,
    });

    return {
      ...release,
      batches: releaseBatches,
      documents: releaseDocuments,
      runs: releaseRuns,
      handoffReadyCount,
      currentDocumentCount: releaseDocuments.filter((document) => document.isCurrent).length,
      queueState,
      latestRun,
    };
  });

  const queueSummary = {
    ALL: mappedReleases.length,
    READY: mappedReleases.filter((release) => release.queueState === "READY").length,
    PENDING_REVIEW: mappedReleases.filter(
      (release) => release.queueState === "PENDING_REVIEW",
    ).length,
    FAILED: mappedReleases.filter((release) => release.queueState === "FAILED").length,
    STALE_BASELINE: mappedReleases.filter(
      (release) => release.queueState === "STALE_BASELINE",
    ).length,
    APPROVED: mappedReleases.filter((release) => release.queueState === "APPROVED").length,
    WAITING: mappedReleases.filter((release) => release.queueState === "WAITING").length,
  } as const;

  return {
    activeQueue,
    queueSummary,
    releases:
      activeQueue === "ALL"
        ? mappedReleases
        : mappedReleases.filter((release) => release.queueState === activeQueue),
  };
}

export type ExtractionReviewPageData = Awaited<
  ReturnType<typeof getExtractionReviewPageData>
>;
