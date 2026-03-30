import "server-only";

import { headers } from "next/headers";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const headerStore = await headers();

  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    metadata: input.metadata ?? null,
    ipAddress:
      headerStore.get("x-forwarded-for") ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  });
}
