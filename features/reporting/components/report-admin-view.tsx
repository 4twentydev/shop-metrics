import {
  deleteMetricTargetAction,
  saveMetricTargetAction,
} from "@/features/metrics/actions";
import {
  deleteReportTemplateAction,
  saveReportTemplateAction,
} from "@/features/reporting/actions";
import type { getReportingAdminPageData } from "@/features/reporting/admin-queries";

type ReportingAdminViewProps = {
  data: Awaited<ReturnType<typeof getReportingAdminPageData>>;
};

export function ReportingAdminView({ data }: ReportingAdminViewProps) {
  return (
    <main className="space-y-6 p-6">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            Reporting admin
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Targets, templates, delivery history, and scheduled operations.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Use this surface to manage targets, update or retire templates, inspect
            export packages, and validate that scheduled reporting runs are creating
            durable retrieval artifacts.
          </p>
          <p className="mt-4 text-sm text-muted">
            Public display token configured: {data.displayAccessConfigured ? "yes" : "no"}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Recent export deliveries</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="px-3 py-2">View</th>
                  <th className="px-3 py-2">Window</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Storage</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">Download</th>
                </tr>
              </thead>
              <tbody>
                {data.deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-t border-line/60">
                    <td className="px-3 py-2">{delivery.reportView}</td>
                    <td className="px-3 py-2">
                      {delivery.windowType} {delivery.windowStart}
                    </td>
                    <td className="px-3 py-2">{delivery.scopeKey ?? "company"}</td>
                    <td className="px-3 py-2">{delivery.packageType}</td>
                    <td className="px-3 py-2">{delivery.primaryFileName ?? "n/a"}</td>
                    <td className="px-3 py-2">
                      {delivery.storageProvider && delivery.storageKey
                        ? `${delivery.storageProvider} stored`
                        : "Not stored"}
                    </td>
                    <td className="px-3 py-2">{delivery.rowCount}</td>
                    <td className="px-3 py-2">
                      {delivery.primaryFileName && delivery.storageKey ? (
                        <a
                          href={`/api/reports/download/${delivery.id}`}
                          className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-muted">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Create target</p>
          <form action={saveMetricTargetAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <select name="windowType" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
            <select name="scopeType" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm">
              <option value="COMPANY">Company</option>
              <option value="DEPARTMENT">Department</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="JOB">Job</option>
              <option value="RELEASE">Release</option>
              <option value="PART_FAMILY">Part family</option>
            </select>
            <input name="scopeReferenceId" placeholder="Scope reference id" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <input name="scopeKey" placeholder="Scope key" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <input name="metricKey" placeholder="Metric key" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <input name="targetValue" type="number" min="0" step="0.01" placeholder="Target value" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <input name="unitLabel" placeholder="Unit label" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <input name="effectiveStart" type="date" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <input name="effectiveEnd" type="date" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <textarea name="notes" rows={3} placeholder="Target notes" className="sm:col-span-2 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <button type="submit" className="justify-self-start rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black">
              Save target
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {data.targets.map((target) => (
              <div key={target.id} className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <form action={saveMetricTargetAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="targetId" value={target.id} />
                  <select name="windowType" defaultValue={target.windowType} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                  <select name="scopeType" defaultValue={target.scopeType} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                    <option value="COMPANY">Company</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="JOB">Job</option>
                    <option value="RELEASE">Release</option>
                    <option value="PART_FAMILY">Part family</option>
                  </select>
                  <input name="scopeReferenceId" defaultValue={target.scopeReferenceId ?? ""} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="scopeKey" defaultValue={target.scopeKey ?? ""} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="metricKey" defaultValue={target.metricKey} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="targetValue" type="number" min="0" step="0.01" defaultValue={target.targetValue} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="unitLabel" defaultValue={target.unitLabel} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="effectiveStart" type="date" defaultValue={target.effectiveStart} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="effectiveEnd" type="date" defaultValue={target.effectiveEnd ?? ""} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <textarea name="notes" rows={2} defaultValue={target.notes ?? ""} className="sm:col-span-2 rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <div className="sm:col-span-2 flex flex-wrap gap-3">
                    <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black">
                      Update target
                    </button>
                  </div>
                </form>
                <form action={deleteMetricTargetAction} className="mt-3">
                  <input type="hidden" name="targetId" value={target.id} />
                  <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
                    Delete target
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Create template</p>
          <form action={saveReportTemplateAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Template name" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <input name="slug" placeholder="template-slug" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" required />
            <select name="viewType" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm">
              <option value="EXECUTIVE">Executive</option>
              <option value="DEPARTMENT">Department</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="JOB">Job</option>
              <option value="RELEASE">Release</option>
              <option value="ACCOUNTABILITY">Accountability</option>
              <option value="REWORK">Rework</option>
              <option value="BOTTLENECK">Bottleneck</option>
            </select>
            <select name="defaultWindowType" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
            <input name="scopeType" placeholder="Scope type" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <input name="scopeKey" placeholder="Scope key" className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <textarea name="description" rows={3} placeholder="Template description" className="sm:col-span-2 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm" />
            <div className="sm:col-span-2 grid gap-2 text-sm text-muted">
              <label className="flex items-center gap-3"><input type="checkbox" name="includeSummary" defaultChecked />Summary</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="includeRaw" defaultChecked />Raw</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="includePivot" defaultChecked />Pivot</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="highlightAccountability" />Highlight accountability</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="highlightBottlenecks" />Highlight bottlenecks</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="mobileCondensed" defaultChecked />Mobile condensed</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="isPinned" />Pinned for display mode</label>
            </div>
            <button type="submit" className="justify-self-start rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black">
              Save template
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {data.templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-line/80 bg-white/[0.03] p-4">
                <form action={saveReportTemplateAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="templateId" value={template.id} />
                  <input name="name" defaultValue={template.name} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="slug" defaultValue={template.slug} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <select name="viewType" defaultValue={template.viewType} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                    <option value="EXECUTIVE">Executive</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="JOB">Job</option>
                    <option value="RELEASE">Release</option>
                    <option value="ACCOUNTABILITY">Accountability</option>
                    <option value="REWORK">Rework</option>
                    <option value="BOTTLENECK">Bottleneck</option>
                  </select>
                  <select name="defaultWindowType" defaultValue={template.defaultWindowType} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                  <input name="scopeType" defaultValue={template.scopeType ?? ""} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <input name="scopeKey" defaultValue={template.scopeKey ?? ""} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <textarea name="description" rows={2} defaultValue={template.description ?? ""} className="sm:col-span-2 rounded-2xl border border-line bg-panel px-4 py-3 text-sm" />
                  <div className="sm:col-span-2 grid gap-2 text-sm text-muted">
                    <label className="flex items-center gap-3"><input type="checkbox" name="includeSummary" defaultChecked={template.sectionConfig.includeSummary} />Summary</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="includeRaw" defaultChecked={template.sectionConfig.includeRaw} />Raw</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="includePivot" defaultChecked={template.sectionConfig.includePivot} />Pivot</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="highlightAccountability" defaultChecked={template.sectionConfig.highlightAccountability} />Highlight accountability</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="highlightBottlenecks" defaultChecked={template.sectionConfig.highlightBottlenecks} />Highlight bottlenecks</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="mobileCondensed" defaultChecked={template.sectionConfig.mobileCondensed} />Mobile condensed</label>
                    <label className="flex items-center gap-3"><input type="checkbox" name="isPinned" defaultChecked={template.isPinned} />Pinned for display mode</label>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-3">
                    <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black">
                      Update template
                    </button>
                  </div>
                </form>
                <form action={deleteReportTemplateAction} className="mt-3">
                  <input type="hidden" name="templateId" value={template.id} />
                  <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
                    Delete template
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
