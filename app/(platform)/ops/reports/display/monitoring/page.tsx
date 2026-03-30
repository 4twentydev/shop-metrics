import type { Metadata } from "next";

import { getDisplayMonitoringPageData } from "@/features/reporting/display-alerts";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Display Monitoring",
};

export default async function DisplayMonitoringPage() {
  await requireOpsRole();
  const data = await getDisplayMonitoringPageData();

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Kiosk Monitoring
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Screen health and stale-heartbeat alerts.
        </h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Screen status</p>
          <div className="mt-4 space-y-3 text-sm">
            {data.heartbeats.map((heartbeat) => (
              <div
                key={heartbeat.id}
                className="rounded-2xl border border-line/80 bg-white/[0.03] p-4"
              >
                <p className="font-semibold">
                  {heartbeat.screenLabel ?? heartbeat.screenKey}
                </p>
                <p className="mt-1 text-muted">
                  Template {heartbeat.lastTemplateSlug ?? "none"} · last seen{" "}
                  {heartbeat.lastSeenAt.toISOString()}
                </p>
                <p className={heartbeat.isStale ? "mt-2 text-warning" : "mt-2 text-muted"}>
                  {heartbeat.isStale ? "Heartbeat stale" : "Heartbeat current"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
          <p className="font-semibold">Alert log</p>
          <div className="mt-4 space-y-3 text-sm">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-line/80 bg-white/[0.03] p-4"
              >
                <p className="font-semibold">{alert.alertType.replaceAll("_", " ")}</p>
                <p className="mt-1 text-muted">{alert.message}</p>
                <p className="mt-2 text-muted">
                  {alert.status} · detected {alert.detectedAt.toISOString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
