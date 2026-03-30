import { NextRequest } from "next/server";

import { syncDisplayAlerts } from "@/features/reporting/display-alerts";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;

  if (expected && authorization !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncDisplayAlerts();

  return Response.json({
    ok: true,
  });
}
