import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Employee",
};

const employeeCards = [
  "Log native-unit work against the same release throughout the shift",
  "Support lead verification during the day before submit-all at shift close",
  "Keep source-of-truth edits human-approved even when extraction assist is present",
];

export default async function EmployeePage() {
  const session = await requireSession();

  return (
    <main className="grid gap-6 p-6 lg:grid-cols-[1fr_0.95fr]">
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Employee shell
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight">
          Fast shift entry with normalized panel-equivalent reporting.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          The work-entry vertical slice is now available. Use the dedicated
          route below to append production, edit entries with version history,
          and hand off lead review cleanly.
        </p>
        <div className="mt-8 grid gap-4">
          {employeeCards.map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-line/80 bg-white/[0.025] p-4"
            >
              {card}
            </div>
          ))}
        </div>
        <Link
          href="/employee/work-entry"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
        >
          Open employee work-entry route
        </Link>
      </section>

      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
          Authenticated user
        </p>
        <p className="mt-3 text-2xl font-semibold">{session.user.name}</p>
        <p className="mt-2 text-sm text-muted">{session.user.email}</p>
        <div className="mt-8 rounded-2xl border border-warning/25 bg-warning/8 p-4 text-sm text-muted">
          Leads still own submit-all and reopen actions. Employees append and
          revise work, but cross-department totals remain restricted to the lead
          route.
        </div>
      </section>
    </main>
  );
}
