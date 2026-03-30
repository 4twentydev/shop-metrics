import Link from "next/link";

import { updateReleaseAdminAction } from "@/features/releases/admin-actions";
import type { getReleaseAdminDetail } from "@/features/releases/admin-queries";

type ReleaseAdminDetailViewProps = {
  data: NonNullable<Awaited<ReturnType<typeof getReleaseAdminDetail>>>;
};

export function ReleaseAdminDetailView({ data }: ReleaseAdminDetailViewProps) {
  const { release, documents, runs } = data;

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <Link href="/ops/releases/admin" className="text-sm font-semibold text-accent">
          Back to release administration
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Release detail
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Job {release.jobNumber} · {release.releaseCode} rev {release.revisionCode}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          {release.customerName} · {release.productName} · {release.partFamily ?? "Unmapped family"}
        </p>
        <p className="mt-3 text-sm">
          Work-entry availability:{" "}
          <span className={release.workEntryAvailable ? "text-success" : "text-warning"}>
            {release.workEntryAvailable ? "Available" : "Blocked"}
          </span>
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-line/80 bg-panel-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Status</p>
          <p className="mt-2 text-2xl font-semibold">{release.releaseStatus}</p>
        </div>
        <div className="rounded-2xl border border-line/80 bg-panel-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Baseline</p>
          <p className="mt-2 text-2xl font-semibold">{release.panelBaseline ?? "Not approved"}</p>
        </div>
        <div className="rounded-2xl border border-line/80 bg-panel-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Current docs</p>
          <p className="mt-2 text-2xl font-semibold">{release.currentDocCount}</p>
        </div>
        <div className="rounded-2xl border border-line/80 bg-panel-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Entries</p>
          <p className="mt-2 text-2xl font-semibold">{release.workEntryCount}</p>
        </div>
        <div className="rounded-2xl border border-line/80 bg-panel-strong p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Locked entries</p>
          <p className="mt-2 text-2xl font-semibold">{release.lockedEntryCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <form
          action={updateReleaseAdminAction}
          className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
        >
          <input type="hidden" name="releaseId" value={release.releaseId} />
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Release controls</p>
          <div className="mt-4 grid gap-3">
            <select
              name="status"
              defaultValue={release.releaseStatus}
              className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm"
            >
              <option value="PENDING_BASELINE">PENDING_BASELINE</option>
              <option value="READY">READY</option>
              <option value="IN_PRODUCTION">IN_PRODUCTION</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="LOCKED">LOCKED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <textarea
              name="notes"
              rows={5}
              defaultValue={release.notes ?? ""}
              placeholder="Release administration notes"
              className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="justify-self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
            >
              Save release
            </button>
          </div>
          <div className="mt-6 space-y-2 text-sm text-muted">
            {release.readinessIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
            {release.readinessIssues.length === 0 ? (
              <p className="text-success">No readiness blockers detected.</p>
            ) : null}
          </div>
        </form>

        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Operational handoff</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/ops/releases/intake" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
              Intake review
            </Link>
            <Link href="/ops/releases/extraction" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
              Extraction queue
            </Link>
            <Link href="/ops/work-entry" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
              Lead work-entry
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
              <p className="font-semibold">Document history</p>
              <div className="mt-3 space-y-3 text-sm text-muted">
                {documents.map((document) => (
                  <div key={document.id}>
                    <p className="font-medium text-foreground">
                      {document.fileName} {document.isCurrent ? "· current" : ""}
                    </p>
                    <p>
                      {document.documentFamily} · {document.kind} · rev {document.revisionNumber}
                    </p>
                    <p>
                      {document.supersedeDecision} · extraction {document.extractionStatus}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
              <p className="font-semibold">Extraction history</p>
              <div className="mt-3 space-y-3 text-sm text-muted">
                {runs.map((run) => (
                  <div key={run.id}>
                    <p className="font-medium text-foreground">
                      Attempt {run.attemptNumber} · {run.status}
                    </p>
                    <p>
                      Review {run.reviewStatus} · confidence {run.confidence ?? "n/a"}
                    </p>
                    {run.errorMessage ? <p className="text-warning">{run.errorMessage}</p> : null}
                  </div>
                ))}
                {runs.length === 0 ? <p>No extraction history yet.</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
