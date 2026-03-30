import { addReleaseCommentAction, reviewDocumentDecisionAction } from "@/features/release-intake/actions";
import { parseReleaseCode } from "@/features/release-intake/logic";
import type { ReleaseIntakePageData } from "@/features/release-intake/queries";
import { UploadBatchForm } from "@/features/release-intake/components/upload-batch-form";

type ReleaseIntakeAdminViewProps = {
  data: ReleaseIntakePageData;
};

export function ReleaseIntakeAdminView({
  data,
}: ReleaseIntakeAdminViewProps) {
  return (
    <main className="space-y-6 p-6">
      <UploadBatchForm
        releases={data.releases.map((release) => ({
          releaseId: release.releaseId,
          jobNumber: release.jobNumber,
          releaseCode: release.releaseCode,
          revisionCode: release.revisionCode,
          productName: release.productName,
        }))}
      />

      <section className="space-y-5">
        {data.releases.map((release) => {
          const parsedRelease = parseReleaseCode(release.releaseCode);
          const currentDocuments = release.documents.filter((document) => document.isCurrent);
          const pendingDocuments = release.documents.filter(
            (document) => document.supersedeDecision === "PENDING",
          );

          return (
            <article
              key={release.releaseId}
              className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
                    Job {release.jobNumber}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    {release.releaseCode} rev {release.revisionCode} · {release.productName}
                  </h2>
                  <p className="mt-3 text-sm text-muted">
                    Release type {parsedRelease.releaseType} · sequence{" "}
                    {parsedRelease.sequence}
                  </p>
                </div>
                <div className="space-y-2 text-right text-sm">
                  <div>{release.releaseStatus}</div>
                  <div>
                    {release.baselineApprovedAt ? "Baseline approved" : "No approved baseline"}
                  </div>
                  <div className={release.baselineStaleAt ? "text-warning" : "text-muted"}>
                    {release.baselineStaleAt
                      ? `Stale baseline flagged`
                      : "Baseline current"}
                  </div>
                </div>
              </div>

              {release.baselineStaleAt ? (
                <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-muted">
                  {release.baselineStaleReason}
                </div>
              ) : null}

              <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="space-y-4">
                  <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      Current release documents
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      {currentDocuments.length === 0 ? (
                        <p className="text-muted">No current documents yet.</p>
                      ) : (
                        currentDocuments.map((document) => (
                          <div
                            key={document.id}
                            className="rounded-2xl border border-line/80 bg-panel px-4 py-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">{document.fileName}</p>
                                <p className="mt-1 text-muted">
                                  {document.documentFamily} · {document.kind} · rev{" "}
                                  {document.revisionNumber}
                                </p>
                              </div>
                              <div className="text-right text-xs uppercase tracking-[0.2em] text-muted">
                                {document.extractionStatus}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      Revision history
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      {release.documents.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-2xl border border-line/80 bg-panel px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{document.fileName}</p>
                              <p className="mt-1 text-muted">
                                {document.documentFamily} · {document.kind} · rev{" "}
                                {document.revisionNumber}
                              </p>
                            </div>
                            <div className="text-right text-xs uppercase tracking-[0.2em] text-muted">
                              <div>{document.isCurrent ? "CURRENT" : "HISTORY"}</div>
                              <div>{document.supersedeDecision}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      Intake batches
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      {release.batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="rounded-2xl border border-line/80 bg-panel px-4 py-4"
                        >
                          <p className="font-semibold">{batch.uploadLabel}</p>
                          <p className="mt-1 text-muted">
                            {batch.status} · uploaded by {batch.uploadedByName ?? "Unknown"}
                          </p>
                          {batch.extractionHandoffAt ? (
                            <p className="mt-1 text-muted">
                              Extraction handoff prepared
                            </p>
                          ) : null}
                          {batch.notes ? (
                            <p className="mt-2 text-muted">{batch.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      Pending supersede review
                    </p>
                    <div className="mt-3 space-y-4">
                      {pendingDocuments.length === 0 ? (
                        <p className="text-sm text-muted">
                          No pending review documents for this release.
                        </p>
                      ) : (
                        pendingDocuments.map((document) => {
                          const currentFamilyCandidates = currentDocuments.filter(
                            (candidate) =>
                              candidate.documentFamily === document.documentFamily,
                          );

                          return (
                            <form
                              key={document.id}
                              action={reviewDocumentDecisionAction}
                              className="rounded-2xl border border-line/80 bg-panel px-4 py-4"
                            >
                              <input type="hidden" name="documentId" value={document.id} />
                              <p className="font-semibold">{document.fileName}</p>
                              <p className="mt-1 text-sm text-muted">
                                {document.documentFamily} · {document.kind} · revision{" "}
                                {document.revisionNumber}
                              </p>
                              {document.uploaderNotes ? (
                                <p className="mt-2 text-sm text-muted">
                                  {document.uploaderNotes}
                                </p>
                              ) : null}
                              <div className="mt-4 grid gap-3 md:grid-cols-[0.34fr_0.66fr]">
                                <select
                                  name="decision"
                                  className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                                  defaultValue="SUPERSEDE"
                                >
                                  <option value="SUPERSEDE">Supersede current</option>
                                  <option value="KEEP_REFERENCE">Keep as reference</option>
                                </select>
                                <select
                                  name="supersedesDocumentId"
                                  className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                                  defaultValue={currentFamilyCandidates[0]?.id ?? ""}
                                >
                                  <option value="">No current document</option>
                                  {currentFamilyCandidates.map((candidate) => (
                                    <option key={candidate.id} value={candidate.id}>
                                      {candidate.fileName} · rev {candidate.revisionNumber}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="submit"
                                className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                              >
                                Save review decision
                              </button>
                            </form>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">
                      Lead / admin notes
                    </p>
                    <form action={addReleaseCommentAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="jobReleaseId" value={release.releaseId} />
                      <textarea
                        name="body"
                        rows={3}
                        placeholder="Add review note or intake comment"
                        className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm"
                        required
                      />
                      <button
                        type="submit"
                        className="justify-self-start rounded-full border border-line px-4 py-2 text-sm font-semibold"
                      >
                        Add comment
                      </button>
                    </form>
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      {release.comments.slice(0, 6).map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-line/80 bg-panel px-4 py-3">
                          <span className="text-white">{comment.authorName}</span>
                          {": "}
                          {comment.body}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
