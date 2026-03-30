import { NextRequest } from "next/server";

import { runScheduledReportingOperations } from "@/features/reporting/cron";
import { env } from "@/lib/env";

const windowMap = {
  daily: ["DAILY"],
  weekly: ["WEEKLY"],
  monthly: ["MONTHLY"],
  annual: ["ANNUAL"],
  all: ["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"],
} as const;

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;

  if (expected && authorization !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode") ?? "all";
  const anchorDate =
    request.nextUrl.searchParams.get("anchorDate") ??
    new Date().toISOString().slice(0, 10);

  const windows =
    windowMap[mode as keyof typeof windowMap] ?? windowMap.all;

  const result = await runScheduledReportingOperations({
    anchorDate,
    windows: [...windows],
  });

  return Response.json({
    ok: true,
    mode,
    anchorDate,
    snapshotCount: result.snapshotResults.length,
    deliveryCount: result.deliveryResults.length,
  });
}
