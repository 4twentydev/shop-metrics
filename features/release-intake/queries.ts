import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  jobs,
  releaseComments,
  releaseIntakeBatches,
  users,
} from "@/lib/db/schema";

export async function getReleaseIntakePageData() {
  const releases = await db
    .select({
      releaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      revisionCode: jobReleases.revisionCode,
      releaseStatus: jobReleases.status,
      baselineApprovedAt: jobReleases.baselineApprovedAt,
      baselineStaleAt: jobReleases.baselineStaleAt,
      baselineStaleReason: jobReleases.baselineStaleReason,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      productName: jobs.productName,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .orderBy(jobs.jobNumber, jobReleases.releaseCode);

  const releaseIds = releases.map((release) => release.releaseId);

  const documents =
    releaseIds.length > 0
      ? await db
          .select({
            id: jobDocuments.id,
            jobReleaseId: jobDocuments.jobReleaseId,
            intakeBatchId: jobDocuments.intakeBatchId,
            kind: jobDocuments.kind,
            documentFamily: jobDocuments.documentFamily,
            revisionNumber: jobDocuments.revisionNumber,
            supersedeDecision: jobDocuments.supersedeDecision,
            supersedesDocumentId: jobDocuments.supersedesDocumentId,
            fileName: jobDocuments.fileName,
            affectsBaseline: jobDocuments.affectsBaseline,
            extractionStatus: jobDocuments.extractionStatus,
            extractionHandoffAt: jobDocuments.extractionHandoffAt,
            isCurrent: jobDocuments.isCurrent,
            uploadedAt: jobDocuments.uploadedAt,
            reviewedAt: jobDocuments.reviewedAt,
            uploaderNotes: jobDocuments.uploaderNotes,
          })
          .from(jobDocuments)
          .where(inArray(jobDocuments.jobReleaseId, releaseIds))
          .orderBy(desc(jobDocuments.uploadedAt))
      : [];

  const batches =
    releaseIds.length > 0
      ? await db
          .select({
            id: releaseIntakeBatches.id,
            jobReleaseId: releaseIntakeBatches.jobReleaseId,
            uploadLabel: releaseIntakeBatches.uploadLabel,
            notes: releaseIntakeBatches.notes,
            status: releaseIntakeBatches.status,
            affectsApprovedBaseline: releaseIntakeBatches.affectsApprovedBaseline,
            extractionHandoffAt: releaseIntakeBatches.extractionHandoffAt,
            createdAt: releaseIntakeBatches.createdAt,
            reviewedAt: releaseIntakeBatches.reviewedAt,
            uploadedByName: users.name,
          })
          .from(releaseIntakeBatches)
          .leftJoin(users, eq(releaseIntakeBatches.uploadedByUserId, users.id))
          .where(inArray(releaseIntakeBatches.jobReleaseId, releaseIds))
          .orderBy(desc(releaseIntakeBatches.createdAt))
      : [];

  const comments =
    releaseIds.length > 0
      ? await db
          .select({
            id: releaseComments.id,
            jobReleaseId: releaseComments.jobReleaseId,
            intakeBatchId: releaseComments.intakeBatchId,
            body: releaseComments.body,
            createdAt: releaseComments.createdAt,
            authorName: users.name,
          })
          .from(releaseComments)
          .innerJoin(users, eq(releaseComments.authorUserId, users.id))
          .where(inArray(releaseComments.jobReleaseId, releaseIds))
          .orderBy(desc(releaseComments.createdAt))
      : [];

  return {
    releases: releases.map((release) => ({
      ...release,
      documents: documents.filter((document) => document.jobReleaseId === release.releaseId),
      batches: batches.filter((batch) => batch.jobReleaseId === release.releaseId),
      comments: comments.filter((comment) => comment.jobReleaseId === release.releaseId),
    })),
  };
}

export async function getCurrentDocumentsForFamily(
  jobReleaseId: string,
  documentFamily: string,
) {
  return db
    .select({
      id: jobDocuments.id,
      fileName: jobDocuments.fileName,
      revisionNumber: jobDocuments.revisionNumber,
    })
    .from(jobDocuments)
    .where(
      and(
        eq(jobDocuments.jobReleaseId, jobReleaseId),
        eq(jobDocuments.documentFamily, documentFamily),
        eq(jobDocuments.isCurrent, true),
      ),
    )
    .orderBy(desc(jobDocuments.revisionNumber));
}

export type ReleaseIntakePageData = Awaited<
  ReturnType<typeof getReleaseIntakePageData>
>;
