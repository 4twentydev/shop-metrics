import Link from "next/link";

import { formatNumber, formatPercent } from "@/lib/utils";

const previewMetrics = [
  {
    label: "Panel-equivalent output",
    value: formatNumber(1842),
    change: "+12.8%",
  },
  {
    label: "Verified releases",
    value: "37",
    change: "+4 today",
  },
  {
    label: "Baseline freshness",
    value: formatPercent(0.94),
    change: "2 stale",
  },
];

export default function MarketingPage() {
  return (
    <main className="grid-overlay min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-line/80 pb-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
              Elward Systems
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Manufacturing Metrics Platform
            </h1>
          </div>
          <nav className="flex items-center gap-3 text-sm text-muted">
            <Link
              href="/sign-in"
              className="rounded-full border border-line px-4 py-2 transition hover:border-accent hover:text-white"
            >
              Sign in
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.38em] text-muted">
              Canonical metric: panel output
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Trace production from native department units back to verified,
              panel-equivalent output.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              This foundation ships the secure core: passkey-first access,
              admin-controlled roles, audit-ready mutations, validated inputs,
              and release-level document handling built for Neon, Drizzle, and
              Vercel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/ops"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                Open ops surface
              </Link>
              <Link
                href="/employee"
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold transition hover:border-white/35"
              >
                Open employee surface
              </Link>
            </div>
          </div>

          <div className="panel-surface rounded-[2rem] p-6">
            <div className="rounded-[1.5rem] border border-line/80 bg-panel-strong p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                    Today
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    Leadership snapshot
                  </h3>
                </div>
                <div className="rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-xs text-success">
                  verified
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {previewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-line/80 bg-white/[0.025] p-4"
                  >
                    <p className="text-sm text-muted">{metric.label}</p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <p className="text-3xl font-semibold">{metric.value}</p>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                        {metric.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
