import type { Metadata } from "next";

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
          The ops surface is scaffolded for leadership and leads. It assumes
          server-side data loading, centralized permissions, and controlled
          status transitions for job releases and downstream shift submissions.
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
            <li>Shift work entry and lead verification workflow</li>
            <li>Job and release administration with baseline approvals</li>
            <li>Document ingestion and AI-assisted extraction review</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
