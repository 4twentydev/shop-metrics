import Link from "next/link";

import {
  createWorkEntryAction,
  updateWorkEntryAction,
} from "@/features/work-entries/actions";
import type { EmployeeWorkEntryPageData } from "@/features/work-entries/queries";
import { formatNumber } from "@/lib/utils";

type EmployeeWorkEntryViewProps = {
  data: EmployeeWorkEntryPageData;
};

function formatTimestamp(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function EmployeeWorkEntryView({ data }: EmployeeWorkEntryViewProps) {
  if (!data.assignment) {
    return (
      <main className="p-6">
        <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Employee work entry
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            No active station assignment
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Work entry derives station, department, and shift from the current
            employee assignment. Add an active assignment before using this
            route.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 p-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-6">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            Employee work entry
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Append work with only the minimum required inputs.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Station, department, native unit type, shift, and business date are
            all derived from your active assignment.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Station
              </p>
              <p className="mt-2 text-lg font-semibold">
                {data.assignment.stationCode} · {data.assignment.stationName}
              </p>
            </div>
            <div className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Shift / business date
              </p>
              <p className="mt-2 text-lg font-semibold">
                {data.assignment.shiftName} · {data.assignment.businessDate}
              </p>
            </div>
          </div>
        </div>

        <form
          action={createWorkEntryAction}
          className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold">Add work entry</h3>
              <p className="mt-2 text-sm text-muted">
                Native unit type is <strong>{data.assignment.nativeUnitLabel}</strong>.
              </p>
            </div>
            <div className="rounded-full border border-accent/35 bg-accent-soft px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent">
              {data.submission?.status ?? "OPEN"}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Job / release</span>
              <select
                name="jobReleaseId"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                required
              >
                <option value="">Select release</option>
                {data.releases.map((release) => (
                  <option key={release.releaseId} value={release.releaseId}>
                    {release.jobNumber} · {release.releaseCode} rev {release.revisionCode} ·{" "}
                    {release.productName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted">
                {data.assignment.nativeUnitLabel} quantity
              </span>
              <input
                type="number"
                name="nativeQuantity"
                step="0.01"
                min="0.01"
                required
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/[0.03] px-4 py-3 text-sm">
              <input type="checkbox" name="isRework" />
              <span>Mark as rework</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-muted">Fault attribution</span>
                <select
                  name="faultDepartmentId"
                  className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                >
                  <option value="">Select department</option>
                  {data.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted">Fixing zone</span>
                <select
                  name="fixingDepartmentId"
                  className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                >
                  <option value="">Select department</option>
                  {data.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="text-muted">Rework notes</span>
              <textarea
                name="reworkNotes"
                rows={3}
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Panel equivalents are calculated automatically.
            </p>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
            >
              Append entry
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
              Current shift entries
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              {data.entries.length} appended entries
            </h3>
          </div>
          <Link
            href="/ops/work-entry"
            className="rounded-full border border-line px-4 py-2 text-sm transition hover:border-accent"
          >
            Lead review route
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {data.entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/80 px-4 py-8 text-sm text-muted">
              No entries yet for this shift.
            </div>
          ) : null}

          {data.entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.5rem] border border-line/80 bg-white/[0.025] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">
                    {entry.jobNumber} · {entry.releaseCode} rev {entry.revisionCode}
                  </p>
                  <h4 className="mt-2 text-xl font-semibold">
                    {formatNumber(Number(entry.nativeQuantity))} {entry.nativeUnitType}
                  </h4>
                  <p className="mt-2 text-sm text-muted">
                    Panel equivalent:{" "}
                    <span className="text-white">
                      {formatNumber(Number(entry.panelEquivalentQuantity))}
                    </span>
                  </p>
                </div>
                <div className="space-y-2 text-right text-xs uppercase tracking-[0.2em] text-muted">
                  <div>{entry.verificationStatus}</div>
                  <div>{entry.isLocked ? "LOCKED" : "OPEN"}</div>
                  <div>v{entry.versionCount}</div>
                </div>
              </div>

              {entry.isRework ? (
                <p className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted">
                  Rework entry{entry.reworkNotes ? ` · ${entry.reworkNotes}` : ""}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 text-xs text-muted sm:grid-cols-2">
                <div>Edited: {formatTimestamp(entry.editedAt) ?? "Never"}</div>
                <div>Verified: {formatTimestamp(entry.verifiedAt) ?? "Pending"}</div>
              </div>

              {!entry.isLocked ? (
                <form
                  action={updateWorkEntryAction}
                  className="mt-5 grid gap-3 rounded-2xl border border-line/80 bg-panel px-4 py-4"
                >
                  <input type="hidden" name="workEntryId" value={entry.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">Native quantity</span>
                      <input
                        type="number"
                        name="nativeQuantity"
                        defaultValue={Number(entry.nativeQuantity)}
                        step="0.01"
                        min="0.01"
                        className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/[0.03] px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        name="isRework"
                        defaultChecked={entry.isRework}
                      />
                      <span>Rework</span>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">Fault attribution</span>
                      <select
                        name="faultDepartmentId"
                        defaultValue={entry.faultDepartmentId ?? ""}
                        className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                      >
                        <option value="">Select department</option>
                        {data.departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="text-muted">Fixing zone</span>
                      <select
                        name="fixingDepartmentId"
                        defaultValue={entry.fixingDepartmentId ?? ""}
                        className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                      >
                        <option value="">Select department</option>
                        {data.departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="text-muted">Rework notes</span>
                    <textarea
                      name="reworkNotes"
                      rows={2}
                      defaultValue={entry.reworkNotes ?? ""}
                      className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-muted">Edit reason</span>
                    <input
                      name="editReason"
                      defaultValue={entry.editReason ?? ""}
                      className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="justify-self-start rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-accent"
                  >
                    Save versioned edit
                  </button>
                </form>
              ) : null}

              {entry.versions.length > 0 ? (
                <div className="mt-5 border-t border-line/80 pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    Version history
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    {entry.versions.slice(0, 5).map((version) => (
                      <div key={version.id}>
                        v{version.versionNumber} · {version.changeType} ·{" "}
                        {version.changedByName ?? "System"}
                        {version.note ? ` · ${version.note}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
