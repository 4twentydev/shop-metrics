import { NextRequest } from "next/server";

import { buildExportArtifact } from "@/features/reporting/exports";
import { buildReportViewModel } from "@/features/reporting/service";
import { exportRequestSchema } from "@/features/reporting/schemas";
import { getSession } from "@/lib/auth/permissions";
import { isOpsRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || !isOpsRole(session.user.activeRole)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = exportRequestSchema.parse({
    view: searchParams.get("view"),
    windowType: searchParams.get("windowType"),
    anchorDate: searchParams.get("anchorDate"),
    format: searchParams.get("format"),
    dataset: searchParams.get("dataset") ?? "summary",
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

  const artifact = await buildExportArtifact({
    report,
    format: parsed.format,
    dataset: parsed.dataset,
    actorUserId: session.user.id,
  });

  return new Response(artifact.body, {
    status: 200,
    headers: {
      "content-type": artifact.contentType,
      "content-disposition":
        parsed.format === "web"
          ? `inline; filename=\"${artifact.fileName}\"`
          : `attachment; filename=\"${artifact.fileName}\"`,
    },
  });
}
