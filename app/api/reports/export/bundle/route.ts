import { NextRequest } from "next/server";

import { buildAndStoreReportBundle } from "@/features/reporting/exports";
import { buildReportViewModel } from "@/features/reporting/service";
import { reportBundleRequestSchema } from "@/features/reporting/schemas";
import { getSession } from "@/lib/auth/permissions";
import { isOpsRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || !isOpsRole(session.user.activeRole)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = reportBundleRequestSchema.parse({
    view: searchParams.get("view"),
    windowType: searchParams.get("windowType"),
    anchorDate: searchParams.get("anchorDate"),
    formats: searchParams
      .getAll("format")
      .map((value) => value.trim())
      .filter(Boolean),
    datasets: searchParams
      .getAll("dataset")
      .map((value) => value.trim())
      .filter(Boolean),
    scopeKey: searchParams.get("scopeKey"),
    templateId: searchParams.get("templateId"),
  });

  const report = await buildReportViewModel({
    view: parsed.view,
    windowType: parsed.windowType,
    anchorDate: parsed.anchorDate,
    scopeKey: parsed.scopeKey ?? null,
    templateId: parsed.templateId ?? null,
  });

  const bundle = await buildAndStoreReportBundle({
    report,
    formats: parsed.formats,
    datasets: parsed.datasets,
    templateId: parsed.templateId ?? null,
    requestedByUserId: session.user.id,
  });

  return new Response(bundle.body, {
    status: 200,
    headers: {
      "content-type": bundle.contentType,
      "content-disposition": `attachment; filename=\"${bundle.fileName}\"`,
    },
  });
}
