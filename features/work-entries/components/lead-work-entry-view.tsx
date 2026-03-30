import {
  addLeadCommentAction,
  reopenShiftAction,
  submitShiftAction,
  updateWorkEntryAction,
  verifyWorkEntryAction,
} from "@/features/work-entries/actions";
import type { LeadWorkEntryPageData } from "@/features/work-entries/queries";
import { formatNumber } from "@/lib/utils";

type LeadWorkEntryViewProps = {
  data: LeadWorkEntryPageData;
};

export function LeadWorkEntryView({ data }: LeadWorkEntryViewProps) {
  return (
    <main className="space-y-6 p-6">
      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            Lead work-entry review
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Cross-department totals are visible here and nowhere lower.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Leads can verify entries throughout the day, leave comments, edit
            with versioned reasons, and perform submit-all or reopen actions.
          </p>
          <div className="mt-6 rounded-2xl border border-line/80 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Business date
            </p>
            <p className="mt-2 text-2xl font-semibold">{data.businessDate}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.departmentTotals.map((total) => (
            <article
              key={total.departmentName}
              className="rounded-[1.5rem] border border-line/80 bg-panel-strong p-5"
            >
              <p className="text-sm text-muted">{total.departmentName}</p>
              <p className="mt-3 text-3xl font-semibold">
                {formatNumber(Number(total.panelEquivalentTotal))}
              </p>
              <p className="mt-2 text-sm text-muted">
                {formatNumber(Number(total.nativeQuantityTotal))} {total.nativeUnitType}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted">
                {total.verifiedCount}/{total.entryCount} verified
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        {data.submissions.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-line/80 bg-panel-strong px-6 py-10 text-sm text-muted">
            No shift submissions exist for the current business date.
          </div>
        ) : null}

        {data.submissions.map((submission) => (
          <article
            key={submission.submissionId}
            className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  {submission.departmentName} · {submission.stationCode} ·{" "}
                  {submission.shiftName}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {submission.employeeName}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {formatNumber(Number(submission.panelEquivalentTotal))} panel
                  equivalent · {submission.unverifiedCount} still unverified
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action={submitShiftAction}>
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.submissionId}
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                  >
                    Submit all
                  </button>
                </form>
                <form action={reopenShiftAction} className="flex flex-wrap gap-2">
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.submissionId}
                  />
                  <input
                    name="reason"
                    placeholder="Reason to reopen"
                    className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-line px-4 py-2 text-sm"
                  >
                    Reopen
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {submission.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[1.4rem] border border-line/80 bg-white/[0.025] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted">
                        {entry.jobNumber} · {entry.releaseCode} rev {entry.revisionCode}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {formatNumber(Number(entry.nativeQuantity))} {entry.nativeUnitType}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        {formatNumber(Number(entry.panelEquivalentQuantity))} panel equivalent
                      </p>
                    </div>
                    <div className="space-y-2 text-right text-xs uppercase tracking-[0.2em] text-muted">
                      <div>{entry.verificationStatus}</div>
                      <div>{entry.isLocked ? "LOCKED" : "OPEN"}</div>
                      <div>v{entry.versionCount}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-[0.7fr_0.3fr]">
                    <form
                      action={updateWorkEntryAction}
                      className="grid gap-3 rounded-2xl border border-line/80 bg-panel px-4 py-4"
                    >
                      <input type="hidden" name="workEntryId" value={entry.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          name="nativeQuantity"
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={Number(entry.nativeQuantity)}
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                        />
                        <input
                          name="editReason"
                          placeholder="Lead edit reason"
                          defaultValue={entry.editReason ?? ""}
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                          required
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          name="faultDepartmentId"
                          defaultValue={entry.faultDepartmentId ?? ""}
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                        >
                          <option value="">Fault attribution</option>
                          {data.departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="fixingDepartmentId"
                          defaultValue={entry.fixingDepartmentId ?? ""}
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                        >
                          <option value="">Fixing zone</option>
                          {data.departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/[0.03] px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          name="isRework"
                          defaultChecked={entry.isRework}
                        />
                        <span>Rework</span>
                      </label>
                      <textarea
                        name="reworkNotes"
                        rows={2}
                        defaultValue={entry.reworkNotes ?? ""}
                        placeholder="Rework notes"
                        className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                      />
                      <button
                        type="submit"
                        className="justify-self-start rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-accent"
                      >
                        Save lead edit
                      </button>
                    </form>

                    <div className="grid gap-3">
                      <form
                        action={verifyWorkEntryAction}
                        className="grid gap-3 rounded-2xl border border-line/80 bg-panel px-4 py-4"
                      >
                        <input type="hidden" name="workEntryId" value={entry.id} />
                        <textarea
                          name="comment"
                          rows={3}
                          placeholder="Verification comment"
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black"
                        >
                          Verify
                        </button>
                      </form>
                      <form
                        action={addLeadCommentAction}
                        className="grid gap-3 rounded-2xl border border-line/80 bg-panel px-4 py-4"
                      >
                        <input type="hidden" name="workEntryId" value={entry.id} />
                        <textarea
                          name="body"
                          rows={3}
                          placeholder="Lead comment"
                          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                          required
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                        >
                          Add comment
                        </button>
                      </form>
                    </div>
                  </div>

                  {entry.comments.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-line/80 bg-panel px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        Lead comments
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted">
                        {entry.comments.slice(0, 4).map((comment) => (
                          <div key={comment.id}>
                            <span className="text-white">{comment.authorName}</span>
                            {": "}
                            {comment.body}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {entry.versions.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-line/80 bg-panel px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        Version history
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted">
                        {entry.versions.slice(0, 6).map((version) => (
                          <div key={version.id}>
                            v{version.versionNumber} · {version.changeType} ·{" "}
                            {version.changedByName ?? "System"}
                            {version.note ? ` · ${version.note}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
