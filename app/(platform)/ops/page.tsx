import type { Metadata } from "next";
import Link from "next/link";

import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Ops",
};

const opsCards = [
  "Production command center for verified panel-equivalent output",
  "Baseline approval queue with stale-release signals after revised uploads",
  "Shift-close controls, submit-all locking, and reopen audit coverage",
];

export default async function OpsPage() {
  const session = await requireOpsRole();

  return (
    <main className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Ops shell
        </p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
          Verified releases, controlled baselines, and auditable shift closure.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          The work-entry vertical slice is now available for verification,
          lead comments, cross-department rollups, submit-all locking, and
          reopen audit coverage.
        </p>
        <div className="mt-8 grid gap-4">
          {opsCards.map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-line/80 bg-white/[0.025] p-4"
            >
              {card}
            </div>
          ))}
        </div>
        <Link
          href="/ops/work-entry"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
        >
          Open lead work-entry route
        </Link>
      </section>

      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Signed in as
          </p>
          <p className="mt-3 text-2xl font-semibold">{session.user.name}</p>
          <p className="mt-2 text-sm text-muted">{session.user.email}</p>
        </div>
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Next operational modules</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Job and release administration with baseline approvals</li>
            <li>Document ingestion and AI-assisted extraction review</li>
            <li>Targets, reporting summaries, and export pipelines</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
