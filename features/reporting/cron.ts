import "server-only";

import { createHash } from "node:crypto";

import { runMetricSnapshotBackfill, runMetricSnapshotJob } from "@/features/metrics/snapshot-job";
import { buildReportViewModel } from "@/features/reporting/service";
import {
  buildExportArtifact,
  recordReportDelivery,
  storeReportArtifact,
} from "@/features/reporting/exports";

export async function runScheduledReportingOperations(input: {
  anchorDate: string;
  windows?: Array<"DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL">;
  actorUserId?: string | null;
}) {
  const windows = input.windows ?? ["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"];
  const snapshotResults =
    windows.length === 4 &&
    windows.includes("DAILY") &&
    windows.includes("WEEKLY") &&
    windows.includes("MONTHLY") &&
    windows.includes("ANNUAL")
      ? await runMetricSnapshotBackfill({
          anchorBusinessDate: input.anchorDate,
          actorUserId: input.actorUserId ?? null,
        })
      : await Promise.all(
          windows.map((windowType) =>
            runMetricSnapshotJob({
              windowType,
              anchorBusinessDate: input.anchorDate,
              actorUserId: input.actorUserId ?? null,
            }),
          ),
        );

  const deliveryResults = [];
  for (const windowType of windows) {
    const report = await buildReportViewModel({
      view: "EXECUTIVE",
      windowType,
      anchorDate: input.anchorDate,
      templateId: null,
    });

    const artifact = await buildExportArtifact({
      report,
      format: "csv",
      dataset: "summary",
      actorUserId: input.actorUserId ?? null,
    });
    const checksumSha256 = createHash("sha256")
      .update(typeof artifact.body === "string" ? artifact.body : artifact.body)
      .digest("hex");
    const stored = await storeReportArtifact({
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      body: artifact.body,
      checksumSha256,
      reportView: report.view,
      windowType: report.range.windowType,
      windowStart: report.range.windowStart,
    });

    const delivery = await recordReportDelivery({
      report,
      templateId: null,
      packageType: "BUNDLE",
      requestedFormats: ["csv"],
      requestedDatasets: ["summary"],
      primaryFileName: artifact.fileName,
      primaryContentType: artifact.contentType,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      storageUrl: stored.storageUrl,
      byteSize:
        typeof artifact.body === "string"
          ? Buffer.byteLength(artifact.body)
          : artifact.body.byteLength,
      rowCount: report.rawRows.length,
      packageManifest: {
        generatedBy: "cron",
        view: report.view,
        windowType,
      },
      requestedByUserId: input.actorUserId ?? null,
    });

    deliveryResults.push(delivery);
  }

  return {
    snapshotResults,
    deliveryResults,
  };
}
