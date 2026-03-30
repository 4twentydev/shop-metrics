import type { Route } from "next";
import Link from "next/link";

import {
  approveExtractionBaselineAction,
  bulkApproveExtractionBaselinesAction,
  bulkRejectExtractionRunsAction,
  rejectExtractionRunAction,
  retryBulkExtractionAction,
  retryReleaseExtractionAction,
  saveExtractionReviewAction,
  startBulkExtractionAction,
  startReleaseExtractionAction,
} from "@/features/extraction/actions";
import { buildPlaybookFromDocumentKinds } from "@/features/extraction/triage-playbooks";
import type { ExtractionReviewPageData } from "@/features/extraction/queries";
import { formatNumber } from "@/lib/utils";

type ExtractionReviewViewProps = {
  data: ExtractionReviewPageData;
};

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function ExtractionReviewView({ data }: ExtractionReviewViewProps) {
  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-wrap gap-3">
        <form action={startBulkExtractionAction} id="bulk-start-form">
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
          >
            Start selected extractions
          </button>
        </form>
        <form action={retryBulkExtractionAction} id="bulk-retry-form">
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Retry selected releases
          </button>
        </form>
        <form action={bulkApproveExtractionBaselinesAction} id="bulk-approve-form">
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
          >
            Approve selected baselines
          </button>
        </form>
        <form action={bulkRejectExtractionRunsAction} id="bulk-reject-form" className="flex flex-wrap gap-3">
          <select
            name="failureReason"
            defaultValue="HUMAN_REVIEW_REQUIRED"
            className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
          >
            <option value="HUMAN_REVIEW_REQUIRED">Human review required</option>
            <option value="DOCUMENT_SET_INVALID">Document set invalid</option>
            <option value="OCR_QUALITY">OCR quality</option>
            <option value="MODEL_FAILURE">Model failure</option>
            <option value="NORMALIZATION_ERROR">Normalization error</option>
            <option value="TIMEOUT">Timeout</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <input
            name="failureTriageNotes"
            placeholder="Bulk triage notes"
            className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Reject selected runs
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              label: "Ready",
              value: data.queueSummary.READY,
              href: "/ops/releases/extraction?queue=READY",
            },
            {
              label: "Pending review",
              value: data.queueSummary.PENDING_REVIEW,
              href: "/ops/releases/extraction?queue=PENDING_REVIEW",
            },
            {
              label: "Failed",
              value: data.queueSummary.FAILED,
              href: "/ops/releases/extraction?queue=FAILED",
            },
            {
              label: "Stale baseline",
              value: data.queueSummary.STALE_BASELINE,
              href: "/ops/releases/extraction?queue=STALE_BASELINE",
            },
          ] satisfies Array<{ label: string; value: number; href: Route }>
        ).map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        {["ALL", "READY", "PENDING_REVIEW", "FAILED", "STALE_BASELINE", "APPROVED", "WAITING"].map(
          (queue) => (
            <Link
              key={queue}
              href={
                (queue === "ALL"
                  ? "/ops/releases/extraction"
                  : `/ops/releases/extraction?queue=${queue}`) as Route
              }
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                data.activeQueue === queue
                  ? "border-accent bg-accent-soft text-white"
                  : "border-line text-muted"
              }`}
            >
              {queue.replaceAll("_", " ")}
            </Link>
          ),
        )}
      </section>

      {data.releases.map((release) => {
        const latestRun = release.runs[0];
        const latestReviewableRun =
          release.runs.find((run) => run.status === "SUCCEEDED") ?? null;
        const currentDocs = release.documents.filter((document) => document.isCurrent);
        const handoffBatches = release.batches.filter(
          (batch) => batch.status === "HANDOFF_READY",
        );
        const playbook = buildPlaybookFromDocumentKinds(
          currentDocs.map((document) => document.kind),
        );
        const reviewPayload = (latestReviewableRun?.reviewedOutput ??
          latestReviewableRun?.normalizedOutput) as
          | {
              summary?: {
                expectedPanels?: number;
                releaseTotals?: string;
                materialTotals?: string;
                partTotals?: string;
                accessoryTotals?: string;
                dueDates?: string[];
                revisionNotes?: string[];
                additionalSummaryFields?: Array<{
                  label: string;
                  value: string;
                }>;
              };
            }
          | undefined;

        return (
          <article
            key={release.releaseId}
            className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <label className="mb-3 inline-flex items-center gap-3 rounded-full border border-line px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted">
                  <input
                    type="checkbox"
                    name="jobReleaseIds"
                    value={release.releaseId}
                    form={release.queueState === "FAILED" ? "bulk-retry-form" : "bulk-start-form"}
                  />
                  Select
                </label>
                <div className="mb-3 flex flex-wrap gap-2">
                  {latestReviewableRun ? (
                    <label className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                      <input
                        type="checkbox"
                        name="extractionRunIds"
                        value={latestReviewableRun.id}
                        form="bulk-approve-form"
                      />
                      Approve
                    </label>
                  ) : null}
                  {latestRun ? (
                    <label className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-muted">
                      <input
                        type="checkbox"
                        name="extractionRunIds"
                        value={latestRun.id}
                        form="bulk-reject-form"
                      />
                      Reject
                    </label>
                  ) : null}
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
                  Extraction review
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Job {release.jobNumber} · {release.releaseCode} rev {release.revisionCode}
                </h2>
                <p className="mt-2 text-sm text-muted">{release.productName}</p>
                <p className="mt-2 text-sm text-muted">
                  Playbook: <span className="font-semibold text-foreground">{playbook.label}</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                  Queue state:{" "}
                  <span className="font-semibold text-foreground">
                    {release.queueState.replaceAll("_", " ")}
                  </span>
                </p>
                <Link
                  href={`/ops/releases/admin/${release.releaseId}`}
                  className="mt-3 inline-flex text-sm font-semibold text-accent"
                >
                  Open release admin detail
                </Link>
              </div>
              <div className="space-y-2 text-right text-sm">
                <div>
                  Approved baseline:{" "}
                  {release.panelBaseline
                    ? formatNumber(Number(release.panelBaseline))
                    : "Not approved"}
                </div>
                <div className={release.baselineStaleAt ? "text-warning" : "text-muted"}>
                  {release.baselineStaleAt
                    ? "Stale baseline review required"
                    : "Baseline current"}
                </div>
                <div className="text-muted">
                  Current docs {release.currentDocumentCount} · handoff ready{" "}
                  {release.handoffReadyCount}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="space-y-4">
                <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    Current document set
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    {currentDocs.map((document) => (
                      <div key={document.id}>
                        {document.fileName} · {document.documentFamily} · {document.kind}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    {playbook.checklist.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    Extraction runs
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    {release.runs.length === 0 ? (
                      <p className="text-muted">No extraction runs yet.</p>
                    ) : (
                      release.runs.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-2xl border border-line/80 bg-panel px-4 py-4"
                        >
                          <p className="font-semibold">
                            Attempt {run.attemptNumber} · {run.status}
                          </p>
                          <p className="mt-1 text-muted">
                            {run.provider} · {run.model}
                          </p>
                          {run.processingMetadata ? (
                            <p className="mt-2 text-muted">
                              Preprocessed {String((run.processingMetadata as { documentCount?: number }).documentCount ?? 0)} docs · families{" "}
                              {Array.isArray(
                                (run.processingMetadata as { families?: unknown[] }).families,
                              )
                                ? (run.processingMetadata as { families: string[] }).families.join(", ")
                                : "n/a"}
                            </p>
                          ) : null}
                          {run.errorMessage ? (
                            <p className="mt-2 text-warning">{run.errorMessage}</p>
                          ) : null}
                          {run.failureReason ? (
                            <p className="mt-2 text-sm text-muted">
                              Triage: {run.failureReason.replaceAll("_", " ")}
                              {run.failureTriageNotes ? ` · ${run.failureTriageNotes}` : ""}
                            </p>
                          ) : null}
                          {run.status === "FAILED" ? (
                            <div className="mt-3 flex flex-wrap gap-3">
                              <form action={retryReleaseExtractionAction}>
                                <input type="hidden" name="extractionRunId" value={run.id} />
                                <button
                                  type="submit"
                                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                                >
                                  Retry extraction
                                </button>
                              </form>
                              <form action={rejectExtractionRunAction} className="flex flex-wrap gap-3">
                                <input type="hidden" name="extractionRunId" value={run.id} />
                                <select
                                  name="failureReason"
                                  defaultValue={run.failureReason ?? "HUMAN_REVIEW_REQUIRED"}
                                  className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
                                >
                                  <option value="HUMAN_REVIEW_REQUIRED">Human review required</option>
                                  <option value="DOCUMENT_SET_INVALID">Document set invalid</option>
                                  <option value="OCR_QUALITY">OCR quality</option>
                                  <option value="MODEL_FAILURE">Model failure</option>
                                  <option value="NORMALIZATION_ERROR">Normalization error</option>
                                  <option value="TIMEOUT">Timeout</option>
                                  <option value="UNKNOWN">Unknown</option>
                                </select>
                                <input
                                  name="failureTriageNotes"
                                  defaultValue={run.failureTriageNotes ?? ""}
                                  placeholder="Triage notes"
                                  className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                                >
                                  Mark triaged
                                </button>
                              </form>
                            </div>
                          ) : null}
                          {run.status === "SUCCEEDED" && run.reviewStatus !== "APPROVED" ? (
                            <form action={rejectExtractionRunAction} className="mt-3 flex flex-wrap gap-3">
                              <input type="hidden" name="extractionRunId" value={run.id} />
                              <select
                                name="failureReason"
                                defaultValue="HUMAN_REVIEW_REQUIRED"
                                className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
                              >
                                <option value="HUMAN_REVIEW_REQUIRED">Human review required</option>
                                <option value="DOCUMENT_SET_INVALID">Document set invalid</option>
                                <option value="OCR_QUALITY">OCR quality</option>
                                <option value="MODEL_FAILURE">Model failure</option>
                                <option value="NORMALIZATION_ERROR">Normalization error</option>
                                <option value="TIMEOUT">Timeout</option>
                                <option value="UNKNOWN">Unknown</option>
                              </select>
                              <input
                                name="failureTriageNotes"
                                placeholder="Reject reason"
                                className="rounded-full border border-line bg-panel px-4 py-2 text-sm"
                              />
                              <button
                                type="submit"
                                className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                              >
                                Reject run
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    Start or refresh extraction
                  </p>
                  <div className="mt-3 space-y-3">
                    {handoffBatches.map((batch) => (
                      <form key={batch.id} action={startReleaseExtractionAction}>
                        <input type="hidden" name="jobReleaseId" value={release.releaseId} />
                        <input type="hidden" name="intakeBatchId" value={batch.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                        >
                          Extract {batch.uploadLabel}
                        </button>
                      </form>
                    ))}
                    {handoffBatches.length === 0 ? (
                      <p className="text-sm text-muted">
                        No handoff-ready intake batch is available.
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Summary review
                </p>
                {latestReviewableRun && reviewPayload?.summary ? (
                  <form action={saveExtractionReviewAction} className="mt-4 grid gap-4">
                    <input
                      type="hidden"
                      name="extractionRunId"
                      value={latestReviewableRun.id}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Expected panels</span>
                        <input
                          name="expectedPanels"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={reviewPayload.summary.expectedPanels ?? 0}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Release totals</span>
                        <textarea
                          name="releaseTotals"
                          rows={3}
                          defaultValue={reviewPayload.summary.releaseTotals ?? ""}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Material totals</span>
                        <textarea
                          name="materialTotals"
                          rows={3}
                          defaultValue={reviewPayload.summary.materialTotals ?? ""}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Part totals</span>
                        <textarea
                          name="partTotals"
                          rows={3}
                          defaultValue={reviewPayload.summary.partTotals ?? ""}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Accessory totals</span>
                        <textarea
                          name="accessoryTotals"
                          rows={3}
                          defaultValue={reviewPayload.summary.accessoryTotals ?? ""}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="text-muted">Due dates</span>
                        <textarea
                          name="dueDates"
                          rows={3}
                          defaultValue={asArray(reviewPayload.summary.dueDates).join("\n")}
                          className="rounded-2xl border border-line bg-panel px-4 py-3"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">Revision notes</span>
                      <textarea
                        name="revisionNotes"
                        rows={4}
                        defaultValue={asArray(reviewPayload.summary.revisionNotes).join("\n")}
                        className="rounded-2xl border border-line bg-panel px-4 py-3"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">
                        Additional summary fields JSON array
                      </span>
                      <textarea
                        name="additionalSummaryFields"
                        rows={4}
                        defaultValue={JSON.stringify(
                          reviewPayload.summary.additionalSummaryFields ?? [],
                          null,
                          2,
                        )}
                        className="rounded-2xl border border-line bg-panel px-4 py-3 font-mono text-xs"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">Reviewer notes</span>
                      <textarea
                        name="reviewerNotes"
                        rows={3}
                        defaultValue={latestReviewableRun.reviewerNotes ?? ""}
                        className="rounded-2xl border border-line bg-panel px-4 py-3"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                      >
                        Save reviewed summary
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Run extraction from a handoff-ready batch to review structured fields.
                  </p>
                )}

                {latestReviewableRun?.status === "SUCCEEDED" &&
                latestReviewableRun.reviewedOutput ? (
                  <form action={approveExtractionBaselineAction} className="mt-4">
                    <input
                      type="hidden"
                      name="extractionRunId"
                      value={latestReviewableRun.id}
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
                    >
                      Approve reviewed baseline
                    </button>
                  </form>
                ) : null}
              </section>
            </div>
          </article>
        );
      })}
      {data.releases.length === 0 ? (
        <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6 text-sm text-muted">
          No releases matched the current extraction queue filter.
        </section>
      ) : null}
    </main>
  );
}
