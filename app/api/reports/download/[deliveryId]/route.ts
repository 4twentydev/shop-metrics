import { eq } from "drizzle-orm";

import { verifySignedDownload } from "@/features/reporting/download-signing";
import { db } from "@/lib/db";
import { reportExportDeliveries } from "@/lib/db/schema";
import { fileStorage } from "@/lib/storage";
import { getSession } from "@/lib/auth/permissions";
import { isOpsRole } from "@/lib/auth/roles";

type RouteProps = {
  params: Promise<{
    deliveryId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { deliveryId } = await params;
  const url = new URL(request.url);
  const session = await getSession();
  const signedAccess =
    typeof url.searchParams.get("expires") === "string" &&
    typeof url.searchParams.get("signature") === "string" &&
    verifySignedDownload({
      deliveryId,
      expiresAt: url.searchParams.get("expires")!,
      signature: url.searchParams.get("signature")!,
    });

  if ((!session || !isOpsRole(session.user.activeRole)) && !signedAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  const delivery = await db.query.reportExportDeliveries.findFirst({
    where: eq(reportExportDeliveries.id, deliveryId),
  });

  if (
    !delivery ||
    !delivery.storageKey ||
    !delivery.primaryFileName ||
    delivery.cleanupStatus !== "ACTIVE"
  ) {
    return new Response("Not Found", { status: 404 });
  }

  const buffer = await fileStorage.readFile(delivery.storageKey);

  return new Response(buffer, {
    headers: {
      "content-type": delivery.primaryContentType ?? "application/octet-stream",
      "content-disposition": `attachment; filename=\"${delivery.primaryFileName}\"`,
    },
  });
}
