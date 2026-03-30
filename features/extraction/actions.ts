"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { extractReleaseSummaryWithGemini } from "@/features/extraction/gemini-service";
import { releaseExtractionSummarySchema } from "@/features/extraction/normalization";
import {
  bulkReviewSchema,
  bulkExtractionSchema,
  extractionFailureReasonSchema,
  readOptionalString,
  rejectExtractionSchema,
  retryExtractionSchema,
  reviewExtractionSchema,
  startExtractionSchema,
} from "@/features/extraction/schemas";
import { preprocessReleaseDocuments } from "@/features/extraction/preprocessing";
import {
  buildDocumentFamilySignature,
  buildPlaybookFromDocumentKinds,
} from "@/features/extraction/triage-playbooks";
import { syncReleaseReadinessNotifications } from "@/features/releases/readiness-notifications";
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

function inferFailureReason(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "unknown extraction failure";

  if (message.includes("timeout")) {
    return "TIMEOUT" as const;
  }

  if (message.includes("document") || message.includes("no current documents")) {
    return "DOCUMENT_SET_INVALID" as const;
  }

  if (message.includes("json") || message.includes("schema")) {
    return "NORMALIZATION_ERROR" as const;
  }

  if (message.includes("ocr")) {
    return "OCR_QUALITY" as const;
  }

  if (message.includes("review")) {
    return "HUMAN_REVIEW_REQUIRED" as const;
  }

  if (message.includes("gemini") || message.includes("model")) {
    return "MODEL_FAILURE" as const;
  }

  return "UNKNOWN" as const;
}

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

  const preprocessed = preprocessReleaseDocuments({
    releaseLabel: `${release.releaseCode} rev ${release.revisionCode}`,
    documents: docs,
  });

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
      sourceDocumentIds: preprocessed.orderedDocuments.map((doc) => doc.id),
      processingMetadata: preprocessed.processingMetadata,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: releaseExtractionRuns.id });

  const runId = run[0]!.id;

  try {
    const result = await extractReleaseSummaryWithGemini({
      releaseLabel: `${release.releaseCode} rev ${release.revisionCode}`,
      preprocessingPrompt: preprocessed.promptSections,
      documents: preprocessed.orderedDocuments,
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
        preprocessing: preprocessed.processingMetadata,
      },
    });
  } catch (error) {
    await db
      .update(releaseExtractionRuns)
      .set({
        status: "FAILED",
        failureReason: inferFailureReason(error),
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

  await syncReleaseReadinessNotifications();
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

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
}

function readUuidList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function loadRunDocuments(runIds: string[]) {
  const runs = await db
    .select()
    .from(releaseExtractionRuns)
    .where(inArray(releaseExtractionRuns.id, runIds));

  const releaseIds = [...new Set(runs.map((run) => run.jobReleaseId))];
  const documents =
    releaseIds.length === 0
      ? []
      : await db
          .select({
            id: jobDocuments.id,
            jobReleaseId: jobDocuments.jobReleaseId,
            kind: jobDocuments.kind,
            documentFamily: jobDocuments.documentFamily,
            isCurrent: jobDocuments.isCurrent,
          })
          .from(jobDocuments)
          .where(inArray(jobDocuments.jobReleaseId, releaseIds));

  return runs.map((run) => ({
    run,
    documents: documents.filter((document) => document.jobReleaseId === run.jobReleaseId),
  }));
}

async function assertBulkReviewGuardrails(input: {
  runIds: string[];
  mode: "APPROVE" | "REJECT";
  failureReason?: string;
}) {
  const runSets = await loadRunDocuments(input.runIds);

  if (runSets.length === 0) {
    throw new Error("No extraction runs were selected.");
  }

  const signatures = runSets.map((item) =>
    buildDocumentFamilySignature(
      item.documents
        .filter((document) => document.isCurrent)
        .map((document) => ({
          kind: document.kind,
          documentFamily: document.documentFamily,
        })),
    ),
  );

  if (new Set(signatures).size > 1) {
    throw new Error(
      "Bulk review requires homogeneous document-family sets. Split selection by packet family first.",
    );
  }

  const playbook = buildPlaybookFromDocumentKinds(
    runSets[0]!.documents.filter((document) => document.isCurrent).map((document) => document.kind),
  );

  if (
    input.mode === "REJECT" &&
    input.failureReason &&
    !playbook.allowedFailureReasons.includes(
      input.failureReason as (typeof playbook.allowedFailureReasons)[number],
    )
  ) {
    throw new Error(
      `Bulk reject reason ${input.failureReason} is not allowed for ${playbook.label}.`,
    );
  }
}

export async function startBulkExtractionAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = bulkExtractionSchema.parse({
    jobReleaseIds: readUuidList(formData, "jobReleaseIds"),
  });

  for (const jobReleaseId of parsed.jobReleaseIds) {
    await runExtraction({
      jobReleaseId,
      createdByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.bulk-started",
    entityType: "release_extraction_queue",
    entityId: parsed.jobReleaseIds.join(","),
    metadata: {
      releaseCount: parsed.jobReleaseIds.length,
    },
  });

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
}

export async function retryBulkExtractionAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = bulkExtractionSchema.parse({
    jobReleaseIds: readUuidList(formData, "jobReleaseIds"),
  });

  for (const jobReleaseId of parsed.jobReleaseIds) {
    const priorRun = await db.query.releaseExtractionRuns.findFirst({
      where: eq(releaseExtractionRuns.jobReleaseId, jobReleaseId),
      orderBy: [desc(releaseExtractionRuns.createdAt)],
    });

    await runExtraction({
      jobReleaseId,
      intakeBatchId: priorRun?.intakeBatchId ?? undefined,
      createdByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.bulk-retried",
    entityType: "release_extraction_queue",
    entityId: parsed.jobReleaseIds.join(","),
    metadata: {
      releaseCount: parsed.jobReleaseIds.length,
    },
  });

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
}

export async function bulkApproveExtractionBaselinesAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = bulkReviewSchema.parse({
    extractionRunIds: readUuidList(formData, "extractionRunIds"),
  });

  await assertBulkReviewGuardrails({
    runIds: parsed.extractionRunIds,
    mode: "APPROVE",
  });

  const runs = await db
    .select()
    .from(releaseExtractionRuns)
    .where(inArray(releaseExtractionRuns.id, parsed.extractionRunIds));

  for (const run of runs) {
    if (run.status !== "SUCCEEDED" || !run.reviewedOutput) {
      continue;
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
        failureReason: null,
        failureTriageNotes: null,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        rejectedAt: null,
        reviewerNotes: parsed.reviewerNotes ?? run.reviewerNotes,
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
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.bulk-approved",
    entityType: "release_extraction_queue",
    entityId: parsed.extractionRunIds.join(","),
    metadata: {
      extractionRunCount: parsed.extractionRunIds.length,
    },
  });

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
  revalidatePath("/ops/releases/intake");
}

export async function rejectExtractionRunAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = rejectExtractionSchema.parse({
    extractionRunId: formData.get("extractionRunId"),
    failureReason: formData.get("failureReason"),
    failureTriageNotes: readOptionalString(formData, "failureTriageNotes"),
    reviewerNotes: readOptionalString(formData, "reviewerNotes"),
  });

  const run = await db.query.releaseExtractionRuns.findFirst({
    where: eq(releaseExtractionRuns.id, parsed.extractionRunId),
  });

  if (!run) {
    throw new Error("Extraction run not found.");
  }

  const release = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.id, run.jobReleaseId),
  });

  await db
    .update(releaseExtractionRuns)
    .set({
      reviewStatus: "REJECTED",
      failureReason: parsed.failureReason,
      failureTriageNotes: parsed.failureTriageNotes ?? null,
      reviewerNotes: parsed.reviewerNotes ?? null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      approvedAt: null,
      rejectedAt: new Date(),
    })
    .where(eq(releaseExtractionRuns.id, run.id));

  await db
    .update(jobDocuments)
    .set({
      extractionStatus: "REJECTED",
    })
    .where(inArray(jobDocuments.id, run.sourceDocumentIds as string[]));

  if (release?.baselineApprovedExtractionRunId === run.id) {
    await db
      .update(jobReleases)
      .set({
        baselineStaleAt: new Date(),
        baselineStaleReason: "Approved extraction run was rejected during review triage.",
        updatedAt: new Date(),
      })
      .where(eq(jobReleases.id, run.jobReleaseId));
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.rejected",
    entityType: "release_extraction_run",
    entityId: run.id,
    metadata: {
      jobReleaseId: run.jobReleaseId,
      failureReason: parsed.failureReason,
      failureTriageNotes: parsed.failureTriageNotes ?? null,
    },
  });

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
}

export async function bulkRejectExtractionRunsAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = bulkReviewSchema.extend({
    failureReason: extractionFailureReasonSchema,
  }).parse({
    extractionRunIds: readUuidList(formData, "extractionRunIds"),
    failureReason: formData.get("failureReason"),
    failureTriageNotes: readOptionalString(formData, "failureTriageNotes"),
    reviewerNotes: readOptionalString(formData, "reviewerNotes"),
  });

  await assertBulkReviewGuardrails({
    runIds: parsed.extractionRunIds,
    mode: "REJECT",
    failureReason: parsed.failureReason,
  });

  const runs = await db
    .select()
    .from(releaseExtractionRuns)
    .where(inArray(releaseExtractionRuns.id, parsed.extractionRunIds));

  const releases = await db
    .select()
    .from(jobReleases)
    .where(inArray(jobReleases.id, runs.map((run) => run.jobReleaseId)));

  for (const run of runs) {
    await db
      .update(releaseExtractionRuns)
      .set({
        reviewStatus: "REJECTED",
        failureReason: parsed.failureReason,
        failureTriageNotes: parsed.failureTriageNotes ?? null,
        reviewerNotes: parsed.reviewerNotes ?? null,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
        approvedAt: null,
        rejectedAt: new Date(),
      })
      .where(eq(releaseExtractionRuns.id, run.id));

    await db
      .update(jobDocuments)
      .set({
        extractionStatus: "REJECTED",
      })
      .where(inArray(jobDocuments.id, run.sourceDocumentIds as string[]));

    const release = releases.find((item) => item.id === run.jobReleaseId);
    if (release?.baselineApprovedExtractionRunId === run.id) {
      await db
        .update(jobReleases)
        .set({
          baselineStaleAt: new Date(),
          baselineStaleReason: "Approved extraction run was rejected during bulk review triage.",
          updatedAt: new Date(),
        })
        .where(eq(jobReleases.id, run.jobReleaseId));
    }
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "release-extraction.bulk-rejected",
    entityType: "release_extraction_queue",
    entityId: parsed.extractionRunIds.join(","),
    metadata: {
      extractionRunCount: parsed.extractionRunIds.length,
      failureReason: parsed.failureReason,
    },
  });

  await syncReleaseReadinessNotifications();
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
      failureReason: null,
      failureTriageNotes: null,
      reviewerNotes: parsed.reviewerNotes ?? null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewStatus: "PENDING_REVIEW",
      rejectedAt: null,
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

  await syncReleaseReadinessNotifications();
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
      failureReason: null,
      failureTriageNotes: null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      approvedAt: new Date(),
      rejectedAt: null,
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

  await syncReleaseReadinessNotifications();
  revalidatePath("/ops/releases/extraction");
  revalidatePath("/ops/releases/intake");
}
