import { eq } from "drizzle-orm";

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

export async function GET(_: Request, { params }: RouteProps) {
  const session = await getSession();

  if (!session || !isOpsRole(session.user.activeRole)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deliveryId } = await params;
  const delivery = await db.query.reportExportDeliveries.findFirst({
    where: eq(reportExportDeliveries.id, deliveryId),
  });

  if (!delivery || !delivery.storageKey || !delivery.primaryFileName) {
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
