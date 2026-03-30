import Link from "next/link";

import { updateReleaseAdminAction } from "@/features/releases/admin-actions";
import type { ReleaseAdminPageData } from "@/features/releases/admin-queries";

type ReleaseAdminViewProps = {
  data: ReleaseAdminPageData;
};

export function ReleaseAdminView({ data }: ReleaseAdminViewProps) {
  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Release administration
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight">
          Baseline readiness and work-entry availability in one place.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          A release is actually available for production only when baseline,
          extraction, document state, and release status line up. This surface
          makes those blockers explicit before crews start logging work.
        </p>
      </section>

      <section className="space-y-5">
        {data.releases.map((release) => (
          <article
            key={release.releaseId}
            className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
                  Job {release.jobNumber}
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                  {release.releaseCode} rev {release.revisionCode} · {release.productName}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {release.customerName} · {release.partFamily ?? "Unmapped family"}
                </p>
              </div>
              <div className="space-y-2 text-right text-sm">
                <div>{release.releaseStatus}</div>
                <div className={release.workEntryAvailable ? "text-success" : "text-warning"}>
                  {release.workEntryAvailable
                    ? "Work-entry available"
                    : "Blocked for work-entry"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Baseline</p>
                <p className="mt-2 text-lg font-semibold">
                  {release.panelBaseline ?? "Not approved"}
                </p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Current docs</p>
                <p className="mt-2 text-lg font-semibold">{release.currentDocCount}</p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Submissions</p>
                <p className="mt-2 text-lg font-semibold">{release.submissionCount}</p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Entries</p>
                <p className="mt-2 text-lg font-semibold">{release.workEntryCount}</p>
              </div>
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Locked</p>
                <p className="mt-2 text-lg font-semibold">{release.lockedEntryCount}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.58fr_0.42fr]">
              <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Readiness blockers
                </p>
                {release.readinessIssues.length === 0 ? (
                  <p className="mt-3 text-sm text-success">
                    No readiness blockers detected.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-warning">
                    {release.readinessIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/ops/releases/admin/${release.releaseId}`}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                  >
                    Open release detail
                  </Link>
                  <Link
                    href="/ops/releases/intake"
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Intake review
                  </Link>
                  <Link
                    href="/ops/releases/extraction"
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Extraction review
                  </Link>
                  <Link
                    href="/ops/work-entry"
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                  >
                    Lead work-entry
                  </Link>
                </div>
              </div>

              <form
                action={updateReleaseAdminAction}
                className="rounded-2xl border border-line/80 bg-white/[0.03] p-4"
              >
                <input type="hidden" name="releaseId" value={release.releaseId} />
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Release controls
                </p>
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
                    rows={4}
                    defaultValue={release.notes ?? ""}
                    placeholder="Release admin notes"
                    className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    className="justify-self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                  >
                    Save release
                  </button>
                </div>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
