"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";

import { saveReportTemplateAction } from "@/features/reporting/actions";
import type { ReportDataset, ReportViewModel } from "@/features/reporting/types";
import { cn } from "@/lib/utils";

const tabOrder: { id: ReportDataset; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "raw", label: "Raw detail" },
  { id: "pivot", label: "Pivot export" },
];

type ReportDashboardViewProps = {
  data: ReportViewModel;
};

function ExportLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href as Parameters<typeof Link>[0]["href"]}
      className="rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-accent"
    >
      {label}
    </Link>
  );
}

export function ReportDashboardView({ data }: ReportDashboardViewProps) {
  const templateConfig = data.activeTemplate?.sectionConfig ?? {
    includeSummary: true,
    includeRaw: true,
    includePivot: true,
    highlightAccountability: false,
    highlightBottlenecks: false,
    mobileCondensed: true,
  };
  const availableTabs = tabOrder.filter((tab) => {
    if (tab.id === "summary") {
      return templateConfig.includeSummary;
    }
    if (tab.id === "raw") {
      return templateConfig.includeRaw;
    }
    return templateConfig.includePivot;
  });
  const [activeTab, setActiveTab] = useState<ReportDataset>(
    availableTabs[0]?.id ?? "summary",
  );
  const csvDataset = templateConfig.includeSummary ? "summary" : availableTabs[0]?.id ?? "summary";
  const excelDataset = templateConfig.includePivot ? "pivot" : availableTabs[0]?.id ?? "summary";
  const pdfDataset = templateConfig.includeSummary ? "summary" : availableTabs[0]?.id ?? "summary";

  const activeSection = useMemo(() => {
    if (activeTab === "raw") {
      return data.rawSection;
    }

    if (activeTab === "pivot") {
      return data.pivotSection;
    }

    return null;
  }, [activeTab, data.pivotSection, data.rawSection]);

  function buildTemplateHref(template: ReportDashboardViewProps["data"]["templates"][number]) {
    const templateScopeKey = template.scopeKey ?? data.templateDefaults.scopeKey;
    const baseQuery = `templateId=${template.id}&windowType=${template.defaultWindowType}&anchorDate=${data.range.windowStart}`;

    if (template.viewType === "DEPARTMENT" && templateScopeKey) {
      return `/ops/reports/departments/${templateScopeKey}?${baseQuery}`;
    }

    if (template.viewType === "EMPLOYEE" && templateScopeKey) {
      return `/ops/reports/employees/${templateScopeKey}?${baseQuery}`;
    }

    if (template.viewType === "JOB" && templateScopeKey) {
      return `/ops/reports/jobs/${templateScopeKey}?${baseQuery}`;
    }

    if (template.viewType === "RELEASE" && templateScopeKey) {
      return `/ops/reports/releases/${templateScopeKey}?${baseQuery}`;
    }

    if (template.viewType === "ACCOUNTABILITY") {
      return `/ops/reports/accountability?${baseQuery}`;
    }

    if (template.viewType === "REWORK") {
      return `/ops/reports/rework?${baseQuery}`;
    }

    if (template.viewType === "BOTTLENECK") {
      return `/ops/reports/bottlenecks?${baseQuery}`;
    }

    return `/ops/reports?${baseQuery}`;
  }

  return (
    <main className="space-y-6 p-6">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
        >
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            {data.eyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            {data.title}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            {data.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted">
            <span className="rounded-full border border-line px-4 py-2">
              {data.scopeLabel}
            </span>
            <span className="rounded-full border border-line px-4 py-2">
              {data.range.windowType}
            </span>
            <span className="rounded-full border border-line px-4 py-2">
              {data.range.windowStart} to {data.range.windowEnd}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ExportLink
              href={`/api/reports/export?view=${data.view}&windowType=${data.range.windowType}&anchorDate=${data.range.windowStart}&format=csv&dataset=${csvDataset}${data.templateDefaults.scopeKey ? `&scopeKey=${data.templateDefaults.scopeKey}` : ""}`}
              label="CSV"
            />
            <ExportLink
              href={`/api/reports/export?view=${data.view}&windowType=${data.range.windowType}&anchorDate=${data.range.windowStart}&format=excel&dataset=${excelDataset}${data.templateDefaults.scopeKey ? `&scopeKey=${data.templateDefaults.scopeKey}` : ""}`}
              label="Excel"
            />
            <ExportLink
              href={`/api/reports/export?view=${data.view}&windowType=${data.range.windowType}&anchorDate=${data.range.windowStart}&format=pdf&dataset=${pdfDataset}${data.templateDefaults.scopeKey ? `&scopeKey=${data.templateDefaults.scopeKey}` : ""}`}
              label="PDF"
            />
            <ExportLink
              href={`/ops/reports`}
              label="Executive"
            />
          </div>
        </motion.div>

        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Saved templates
          </p>
          <div className="mt-4 grid gap-3">
            {data.templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/80 p-4 text-sm text-muted">
                No saved report templates yet.
              </div>
            ) : (
              data.templates.slice(0, 5).map((template) => (
                <Link
                  key={template.id}
                  href={buildTemplateHref(template) as Parameters<typeof Link>[0]["href"]}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-sm transition hover:border-accent",
                    data.activeTemplate?.id === template.id
                      ? "border-accent bg-accent-soft"
                      : "border-line/80 bg-white/[0.03]",
                  )}
                >
                  <p className="font-semibold">{template.name}</p>
                  <p className="mt-1 text-muted">{template.description ?? template.slug}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.summaryCards.map((card, index) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.03 }}
            className={cn(
              "rounded-[1.5rem] border border-line/80 p-5",
              card.tone === "accent"
                ? "bg-accent-soft"
                : card.tone === "warning"
                  ? "bg-warning/8"
                  : "bg-panel-strong",
              templateConfig.mobileCondensed ? "sm:p-4" : "",
            )}
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-muted">{card.hint}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <div className="flex flex-wrap gap-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-accent text-black"
                    : "border border-line text-muted hover:border-accent hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "summary" ? (
            <div className="mt-6 space-y-5">
              {data.summarySections.map((section) => (
                <div
                  key={section.id}
                  className="overflow-hidden rounded-[1.4rem] border border-line/80 bg-white/[0.03]"
                >
                  <div className="border-b border-line/80 px-5 py-4">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <p className="mt-1 text-sm text-muted">{section.description}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/[0.02] text-left text-muted">
                        <tr>
                          {section.columns.map((column) => (
                            <th key={column} className="px-4 py-3 font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, rowIndex) => (
                          <tr key={`${section.id}-${rowIndex}`} className="border-t border-line/60">
                            {row.map((cell, columnIndex) => (
                              <td key={`${section.id}-${rowIndex}-${columnIndex}`} className="px-4 py-3">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : activeSection ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-6 overflow-hidden rounded-[1.4rem] border border-line/80 bg-white/[0.03]"
            >
              <div className="border-b border-line/80 px-5 py-4">
                <h3 className="text-lg font-semibold">{activeSection.title}</h3>
                <p className="mt-1 text-sm text-muted">{activeSection.description}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.02] text-left text-muted">
                    <tr>
                      {activeSection.columns.map((column) => (
                        <th key={column} className="px-4 py-3 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSection.rows.map((row, rowIndex) => (
                      <tr key={`${activeSection.id}-${rowIndex}`} className="border-t border-line/60">
                        {row.map((cell, columnIndex) => (
                          <td key={`${activeSection.id}-${rowIndex}-${columnIndex}`} className="px-4 py-3">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
              Linked drilldowns
            </p>
            <div className="mt-4 grid gap-3">
              {data.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as Parameters<typeof Link>[0]["href"]}
                  className="rounded-2xl border border-line/80 bg-white/[0.03] px-4 py-4 text-sm transition hover:border-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
              Save template
            </p>
            <form action={saveReportTemplateAction} className="mt-4 grid gap-3">
              <input type="hidden" name="templateId" defaultValue={data.activeTemplate?.id ?? ""} />
              <input type="hidden" name="viewType" value={data.view} />
              <input type="hidden" name="defaultWindowType" value={data.range.windowType} />
              <input type="hidden" name="scopeType" value={data.templateDefaults.scopeType ?? ""} />
              <input type="hidden" name="scopeKey" value={data.templateDefaults.scopeKey ?? ""} />
              <input
                name="name"
                defaultValue={data.activeTemplate?.name ?? `${data.title} template`}
                placeholder="Template name"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                required
              />
              <input
                name="slug"
                defaultValue={data.activeTemplate?.slug ?? `${data.view.toLowerCase()}-${data.range.windowType.toLowerCase()}`}
                placeholder="template-slug"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
                required
              />
              <textarea
                name="description"
                rows={3}
                defaultValue={data.activeTemplate?.description ?? ""}
                placeholder="Template description"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm"
              />
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="includeSummary" defaultChecked={data.activeTemplate?.sectionConfig.includeSummary ?? true} />
                Summary tabs
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="includeRaw" defaultChecked={data.activeTemplate?.sectionConfig.includeRaw ?? true} />
                Raw detail tab
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="includePivot" defaultChecked={data.activeTemplate?.sectionConfig.includePivot ?? true} />
                Pivot export tab
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="highlightAccountability" defaultChecked={data.activeTemplate?.sectionConfig.highlightAccountability ?? false} />
                Highlight accountability
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="highlightBottlenecks" defaultChecked={data.activeTemplate?.sectionConfig.highlightBottlenecks ?? false} />
                Highlight bottlenecks
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="mobileCondensed" defaultChecked={data.activeTemplate?.sectionConfig.mobileCondensed ?? true} />
                Mobile condensed mode
              </label>
              <label className="flex items-center gap-3 text-sm text-muted">
                <input type="checkbox" name="isPinned" defaultChecked={data.activeTemplate?.isPinned ?? false} />
                Pin template
              </label>
              <button
                type="submit"
                className="mt-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
              >
                Save report template
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
