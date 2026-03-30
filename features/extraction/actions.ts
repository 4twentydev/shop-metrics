"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { extractReleaseSummaryWithGemini } from "@/features/extraction/gemini-service";
import { releaseExtractionSummarySchema } from "@/features/extraction/normalization";
import {
  readOptionalString,
  retryExtractionSchema,
  reviewExtractionSchema,
  startExtractionSchema,
} from "@/features/extraction/schemas";
import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  jobDocuments,
  jobReleases,
  releaseExtractionRuns,
  releaseIntakeBatches,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

async function runExtraction(input: {
  jobReleaseId: string;
  intakeBatchId?: string;
  createdByUserId: string;
}) {
  const release = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.id, input.jobReleaseId),
  });

  if (!release) {
    throw new Error("Release not found.");
  }

  const docs = await db
    .select({
      id: jobDocuments.id,
      fileName: jobDocuments.fileName,
      kind: jobDocuments.kind,
      documentFamily: jobDocuments.documentFamily,
      storageKey: jobDocuments.storageKey,
      extractionStatus: jobDocuments.extractionStatus,
    })
    .from(jobDocuments)
    .where(
      and(
        eq(jobDocuments.jobReleaseId, input.jobReleaseId),
        eq(jobDocuments.isCurrent, true),
      ),
    );

  if (docs.length === 0) {
    throw new Error("No current documents are available for extraction.");
  }

  const previousRun = await db
    .select({
      attemptNumber: releaseExtractionRuns.attemptNumber,
    })
    .from(releaseExtractionRuns)
    .where(eq(releaseExtractionRuns.jobReleaseId, input.jobReleaseId))
    .orderBy(desc(releaseExtractionRuns.attemptNumber))
    .limit(1);

  const run = await db
    .insert(releaseExtractionRuns)
    .values({
      jobReleaseId: input.jobReleaseId,
      intakeBatchId: input.intakeBatchId ?? null,
      provider: "gemini",
      model: env.GEMINI_MODEL,
      status: "PROCESSING",
      attemptNumber: (previousRun[0]?.attemptNumber ?? 0) + 1,
      sourceDocumentIds: docs.map((doc) => doc.id),
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: releaseExtractionRuns.id });

  const runId = run[0]!.id;

  try {
    const result = await extractReleaseSummaryWithGemini({
      releaseLabel: `${release.releaseCode} rev ${release.revisionCode}`,
      documents: docs,
    });

    await db
      .update(releaseExtractionRuns)
      .set({
        status: "SUCCEEDED",
        rawOutput: result.rawOutput,
        normalizedOutput: result.normalizedOutput,
        reviewedOutput: result.normalizedOutput,
        confidence: result.normalizedOutput.summary.confidence.toFixed(4),
        completedAt: new Date(),
      })
      .where(eq(releaseExtractionRuns.id, runId));

    await db
      .update(jobDocuments)
      .set({
        extractionStatus: "ASSISTED",
        extractedAt: new Date(),
      })
      .where(inArray(jobDocuments.id, docs.map((doc) => doc.id)));

    await writeAuditLog({
      actorUserId: input.createdByUserId,
      action: "release-extraction.succeeded",
      entityType: "release_extraction_run",
      entityId: runId,
      metadata: {
        jobReleaseId: input.jobReleaseId,
        documentCount: docs.length,
      },
    });
  } catch (error) {
    await db
      .update(releaseExtractionRuns)
      .set({
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown extraction failure.",
        completedAt: new Date(),
      })
      .where(eq(releaseExtractionRuns.id, runId));

    await writeAuditLog({
      actorUserId: input.createdByUserId,
      action: "release-extraction.failed",
      entityType: "release_extraction_run",
      entityId: runId,
      metadata: {
        jobReleaseId: input.jobReleaseId,
        error: error instanceof Error ? error.message : "Unknown extraction failure.",
      },
    });
  }
}

export async function startReleaseExtractionAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = startExtractionSchema.parse({
    jobReleaseId: formData.get("jobReleaseId"),
    intakeBatchId: readOptionalString(formData, "intakeBatchId"),
  });

  if (parsed.intakeBatchId) {
    const batch = await db.query.releaseIntakeBatches.findFirst({
      where: eq(releaseIntakeBatches.id, parsed.intakeBatchId),
    });

    if (!batch || batch.status !== "HANDOFF_READY") {
      throw new Error("Only handoff-ready intake batches can be extracted.");
    }
  }

  await runExtraction({
    jobReleaseId: parsed.jobReleaseId,
    intakeBatchId: parsed.intakeBatchId,
    createdByUserId: session.user.id,
  });

  revalidatePath("/ops/releases/extraction");
}

export async function retryReleaseExtractionAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = retryExtractionSchema.parse({
    extractionRunId: formData.get("extractionRunId"),
  });

  const priorRun = await db.query.releaseExtractionRuns.findFirst({
    where: eq(releaseExtractionRuns.id, parsed.extractionRunId),
  });

  if (!priorRun) {
    throw new Error("Extraction run not found.");
  }

  await runExtraction({
    jobReleaseId: priorRun.jobReleaseId,
    intakeBatchId: priorRun.intakeBatchId ?? undefined,
    createdByUserId: session.user.id,
  });

  revalidatePath("/ops/releases/extraction");
}

export async function saveExtractionReviewAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = reviewExtractionSchema.parse({
    extractionRunId: formData.get("extractionRunId"),
    expectedPanels: formData.get("expectedPanels"),
    releaseTotals: formData.get("releaseTotals"),
    materialTotals: formData.get("materialTotals"),
    partTotals: formData.get("partTotals"),
    accessoryTotals: formData.get("accessoryTotals"),
    dueDates: formData.get("dueDates"),
    revisionNotes: formData.get("revisionNotes"),
    additionalSummaryFields: readOptionalString(formData, "additionalSummaryFields"),
    reviewerNotes: readOptionalString(formData, "reviewerNotes"),
  });

  const run = await db.query.releaseExtractionRuns.findFirst({
    where: eq(releaseExtractionRuns.id, parsed.extractionRunId),
  });

  if (!run || run.status !== "SUCCEEDED") {
    throw new Error("Only successful extraction runs can be reviewed.");
  }

  const reviewedOutput = {
    ...(run.normalizedOutput as Record<string, unknown>),
    summary: releaseExtractionSummarySchema.parse({
      expectedPanels: parsed.expectedPanels,
      releaseTotals: parsed.releaseTotals,
      materialTotals: parsed.materialTotals,
      partTotals: parsed.partTotals,
      accessoryTotals: parsed.accessoryTotals,
      dueDates: parsed.dueDates
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      revisionNotes: parsed.revisionNotes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      additionalSummaryFields: parsed.additionalSummaryFields
        ? JSON.parse(parsed.additionalSummaryFields)
        : [],
      confidence: Number(run.confidence ?? 0),
    }),
  };

  await db
    .update(releaseExtractionRuns)
    .set({
      reviewedOutput,
      reviewerNotes: parsed.reviewerNotes ?? null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewStatus: "PENDING_REVIEW",
    })
    .where(eq(releaseExtractionRuns.id, run.id));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.review-saved",
    entityType: "release_extraction_run",
    entityId: run.id,
    metadata: {
      jobReleaseId: run.jobReleaseId,
    },
  });

  revalidatePath("/ops/releases/extraction");
}

export async function approveExtractionBaselineAction(formData: FormData) {
  const session = await requireOpsRole();
  const extractionRunId = String(formData.get("extractionRunId") ?? "");

  const run = await db.query.releaseExtractionRuns.findFirst({
    where: eq(releaseExtractionRuns.id, extractionRunId),
  });

  if (!run || run.status !== "SUCCEEDED" || !run.reviewedOutput) {
    throw new Error("A reviewed successful extraction run is required for approval.");
  }

  const reviewed = run.reviewedOutput as {
    summary: {
      expectedPanels: number;
    };
  };

  await db
    .update(releaseExtractionRuns)
    .set({
      reviewStatus: "APPROVED",
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      approvedAt: new Date(),
    })
    .where(eq(releaseExtractionRuns.id, run.id));

  await db
    .update(jobReleases)
    .set({
      panelBaseline: reviewed.summary.expectedPanels.toFixed(2),
      baselineApprovedAt: new Date(),
      baselineApprovedByUserId: session.user.id,
      baselineApprovedExtractionRunId: run.id,
      baselineStaleAt: null,
      baselineStaleReason: null,
      baselineStaleSourceBatchId: null,
      updatedAt: new Date(),
    })
    .where(eq(jobReleases.id, run.jobReleaseId));

  await db
    .update(jobDocuments)
    .set({
      extractionStatus: "REVIEWED",
    })
    .where(inArray(jobDocuments.id, run.sourceDocumentIds as string[]));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.approved",
    entityType: "release_extraction_run",
    entityId: run.id,
    metadata: {
      jobReleaseId: run.jobReleaseId,
      approvedBaseline: reviewed.summary.expectedPanels,
    },
  });

  revalidatePath("/ops/releases/extraction");
  revalidatePath("/ops/releases/intake");
}
