import "server-only";

import { db } from "@/lib/db";
import { metricSnapshots } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/audit/log";

import { buildMetricSnapshots } from "./engine";
import { loadMetricSourceRows, loadMetricTargets } from "./queries";
import { getMetricWindowRange } from "./windows";
import type { MetricWindow } from "./types";

export async function runMetricSnapshotJob(input: {
  windowType: MetricWindow;
  anchorBusinessDate: string;
  actorUserId?: string | null;
}) {
  const range = getMetricWindowRange(input.windowType, input.anchorBusinessDate);
  const [rows, targets] = await Promise.all([
    loadMetricSourceRows(range),
    loadMetricTargets(range),
  ]);

  const snapshots = buildMetricSnapshots({
    rows,
    targets,
    range,
  });

  if (snapshots.length === 0) {
    return {
      range,
      snapshotCount: 0,
    };
  }

  await db.insert(metricSnapshots).values(
    snapshots.map((snapshot) => ({
      windowType: snapshot.windowType,
      windowStart: snapshot.windowStart,
      windowEnd: snapshot.windowEnd,
      scopeType: snapshot.scopeType,
      scopeReferenceId: snapshot.scopeReferenceId,
      scopeKey: snapshot.scopeKey,
      metrics: snapshot.metrics,
      targetSummary: snapshot.targetSummary,
      sourceSummary: snapshot.sourceSummary,
      createdByUserId: input.actorUserId ?? null,
    })),
  );

  await writeAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: "metrics.snapshot.run",
    entityType: "metric_snapshot_window",
    entityId: `${range.windowType}:${range.windowStart}:${range.windowEnd}`,
    metadata: {
      windowType: range.windowType,
      windowStart: range.windowStart,
      windowEnd: range.windowEnd,
      sourceRowCount: rows.length,
      appliedTargetCount: targets.length,
      snapshotCount: snapshots.length,
    },
  });

  return {
    range,
    snapshotCount: snapshots.length,
  };
}

export async function runMetricSnapshotBackfill(input: {
  anchorBusinessDate: string;
  actorUserId?: string | null;
}) {
  const windows: MetricWindow[] = ["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"];

  const results = [];
  for (const windowType of windows) {
    results.push(
      await runMetricSnapshotJob({
        windowType,
        anchorBusinessDate: input.anchorBusinessDate,
        ...(input.actorUserId !== undefined && {
          actorUserId: input.actorUserId,
        }),
      }),
    );
  }

  return results;
}
