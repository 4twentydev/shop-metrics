import { NextRequest } from "next/server";

import { expireAndCleanupReportArtifacts } from "@/features/reporting/retention";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;

  if (expected && authorization !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireAndCleanupReportArtifacts();

  return Response.json(result);
}
