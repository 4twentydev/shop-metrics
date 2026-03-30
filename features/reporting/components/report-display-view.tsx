import Link from "next/link";

import type { ReportViewModel } from "@/features/reporting/types";
import { cn } from "@/lib/utils";

type ReportDisplayViewProps = {
  data: ReportViewModel;
  pinnedTemplates: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  templateBasePath: string;
  linkQueryString?: string;
  hideTemplateNav?: boolean;
};

export function ReportDisplayView({
  data,
  pinnedTemplates,
  templateBasePath,
  linkQueryString,
  hideTemplateNav,
}: ReportDisplayViewProps) {
  return (
    <main className="min-h-screen bg-graphite text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line/80 pb-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
              Display Mode
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              {data.title}
            </h1>
            <p className="mt-3 text-lg text-muted">
              {data.scopeLabel} · {data.range.windowType} · {data.range.windowStart}
            </p>
          </div>
          {hideTemplateNav ? null : (
            <div className="flex flex-wrap gap-2">
              {pinnedTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`${templateBasePath}/${template.slug}${linkQueryString ?? ""}`}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold",
                    data.activeTemplate?.slug === template.slug
                      ? "border-accent bg-accent-soft text-white"
                      : "border-line text-muted",
                  )}
                >
                  {template.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
            >
              <p className="text-sm text-muted">{card.label}</p>
              <p className="mt-4 text-5xl font-semibold">{card.value}</p>
              <p className="mt-3 text-sm text-muted">{card.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          {data.summarySections.map((section) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-[1.75rem] border border-line/80 bg-panel-strong"
            >
              <div className="border-b border-line/80 px-6 py-5">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm text-muted">{section.description}</p>
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
                    {section.rows.slice(0, 8).map((row, rowIndex) => (
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
        </section>
      </div>
    </main>
  );
}
