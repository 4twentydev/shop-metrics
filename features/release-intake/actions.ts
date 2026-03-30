"use server";

import { createHash } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  addReleaseCommentSchema,
  readOptionalString,
  reviewDocumentDecisionSchema,
  uploadReleaseDocumentsSchema,
} from "@/features/release-intake/schemas";
import { shouldFlagBaselineStale } from "@/features/release-intake/logic";
import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  releaseComments,
  releaseIntakeBatches,
} from "@/lib/db/schema";
import { fileStorage } from "@/lib/storage";

async function refreshBatchStatus(intakeBatchId: string, reviewerUserId: string) {
  const remaining = await db.query.jobDocuments.findMany({
    where: and(
      eq(jobDocuments.intakeBatchId, intakeBatchId),
      eq(jobDocuments.supersedeDecision, "PENDING"),
    ),
  });

  if (remaining.length > 0) {
    return;
  }

  await db
    .update(releaseIntakeBatches)
    .set({
      status: "HANDOFF_READY",
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
      extractionHandoffAt: new Date(),
    })
    .where(eq(releaseIntakeBatches.id, intakeBatchId));

  await db
    .update(jobDocuments)
    .set({
      extractionHandoffAt: new Date(),
    })
    .where(eq(jobDocuments.intakeBatchId, intakeBatchId));
}

export async function uploadReleaseDocumentsAction(formData: FormData) {
  const session = await requireOpsRole();
  const manifestValue = formData.get("documentManifest");

  if (typeof manifestValue !== "string") {
    throw new Error("Document manifest is required.");
  }

  const files = formData
    .getAll("documents")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const parsed = uploadReleaseDocumentsSchema.parse({
    jobReleaseId: formData.get("jobReleaseId"),
    uploadLabel: formData.get("uploadLabel"),
    notes: readOptionalString(formData, "notes"),
    documentManifest: JSON.parse(manifestValue),
  });

  if (files.length !== parsed.documentManifest.length) {
    throw new Error("Uploaded files do not match the manifest.");
  }

  const release = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.id, parsed.jobReleaseId),
  });

  if (!release) {
    throw new Error("Release not found.");
  }

  const affectsApprovedBaseline = shouldFlagBaselineStale({
    baselineApprovedAt: release.baselineApprovedAt,
    manifest: parsed.documentManifest,
  });

  const createdBatch = await db
    .insert(releaseIntakeBatches)
    .values({
      jobReleaseId: parsed.jobReleaseId,
      uploadLabel: parsed.uploadLabel,
      notes: parsed.notes ?? null,
      affectsApprovedBaseline,
      uploadedByUserId: session.user.id,
    })
    .returning({ id: releaseIntakeBatches.id });

  const batchId = createdBatch[0]!.id;

  for (const item of parsed.documentManifest) {
    const file = files[item.index];

    if (!file) {
      throw new Error("Manifest index is missing a file.");
    }

    if (file.type !== "application/pdf") {
      throw new Error("Only PDF uploads are supported.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

    const latestRevision = await db
      .select({
        revisionNumber: jobDocuments.revisionNumber,
      })
      .from(jobDocuments)
      .where(
        and(
          eq(jobDocuments.jobReleaseId, parsed.jobReleaseId),
          eq(jobDocuments.documentFamily, item.documentFamily),
        ),
      )
      .orderBy(desc(jobDocuments.revisionNumber))
      .limit(1);

    const currentForFamily = await db.query.jobDocuments.findFirst({
      where: and(
        eq(jobDocuments.jobReleaseId, parsed.jobReleaseId),
        eq(jobDocuments.documentFamily, item.documentFamily),
        eq(jobDocuments.isCurrent, true),
      ),
    });

    const stored = await fileStorage.storePdf({
      buffer,
      checksumSha256,
      contentType: "application/pdf",
      fileName: file.name,
      releaseId: parsed.jobReleaseId,
    });

    await db.insert(jobDocuments).values({
      jobReleaseId: parsed.jobReleaseId,
      intakeBatchId: batchId,
      kind: item.kind,
      documentFamily: item.documentFamily,
      revisionNumber: (latestRevision[0]?.revisionNumber ?? 0) + 1,
      supersedeDecision: currentForFamily ? "PENDING" : "KEEP_REFERENCE",
      fileName: file.name,
      contentType: "application/pdf",
      byteSize: stored.byteSize,
      checksumSha256,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      storageUrl: stored.storageUrl,
      uploadedByUserId: session.user.id,
      affectsBaseline: item.affectsBaseline,
      uploaderNotes: item.uploaderNotes ?? null,
      isCurrent: currentForFamily ? false : true,
    });
  }

  await refreshBatchStatus(batchId, session.user.id);

  if (affectsApprovedBaseline) {
    await db
      .update(jobReleases)
      .set({
        baselineStaleAt: new Date(),
        baselineStaleReason:
          "A revised intake batch uploaded baseline-affecting documents after approval.",
        baselineStaleSourceBatchId: batchId,
        updatedAt: new Date(),
      })
      .where(eq(jobReleases.id, parsed.jobReleaseId));
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-intake.uploaded",
    entityType: "release_intake_batch",
    entityId: batchId,
    metadata: {
      jobReleaseId: parsed.jobReleaseId,
      uploadLabel: parsed.uploadLabel,
      documentCount: parsed.documentManifest.length,
      affectsApprovedBaseline,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/releases/intake");
}

export async function reviewDocumentDecisionAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = reviewDocumentDecisionSchema.parse({
    documentId: formData.get("documentId"),
    decision: formData.get("decision"),
    supersedesDocumentId: readOptionalString(formData, "supersedesDocumentId"),
  });

  const document = await db.query.jobDocuments.findFirst({
    where: eq(jobDocuments.id, parsed.documentId),
  });

  if (!document || !document.intakeBatchId) {
    throw new Error("Pending document not found.");
  }

  if (parsed.decision === "SUPERSEDE" && parsed.supersedesDocumentId) {
    await db
      .update(jobDocuments)
      .set({
        isCurrent: false,
      })
      .where(eq(jobDocuments.id, parsed.supersedesDocumentId));
  }

  await db
    .update(jobDocuments)
    .set({
      supersedeDecision: parsed.decision,
      supersedesDocumentId: parsed.supersedesDocumentId ?? null,
      isCurrent: parsed.decision === "SUPERSEDE",
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
    })
    .where(eq(jobDocuments.id, document.id));

  await refreshBatchStatus(document.intakeBatchId, session.user.id);

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-document.reviewed",
    entityType: "job_document",
    entityId: document.id,
    beforeState: document,
    metadata: {
      decision: parsed.decision,
      supersedesDocumentId: parsed.supersedesDocumentId ?? null,
    },
  });

  revalidatePath("/ops/releases/intake");
}

export async function addReleaseCommentAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = addReleaseCommentSchema.parse({
    jobReleaseId: formData.get("jobReleaseId"),
    intakeBatchId: readOptionalString(formData, "intakeBatchId"),
    body: formData.get("body"),
  });

  const inserted = await db
    .insert(releaseComments)
    .values({
      jobReleaseId: parsed.jobReleaseId,
      intakeBatchId: parsed.intakeBatchId ?? null,
      authorUserId: session.user.id,
      body: parsed.body,
    })
    .returning({ id: releaseComments.id });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release.comment-added",
    entityType: "release_comment",
    entityId: inserted[0]!.id,
    metadata: {
      jobReleaseId: parsed.jobReleaseId,
      intakeBatchId: parsed.intakeBatchId ?? null,
    },
  });

  revalidatePath("/ops/releases/intake");
}
