import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { hasPublicDisplayAccess } from "@/features/reporting/display-auth";
import { db } from "@/lib/db";
import { displayScreenHeartbeats } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    accessToken?: string;
    playlistId?: string | null;
    screenKey?: string;
    screenLabel?: string | null;
    templateSlug?: string | null;
    path?: string | null;
    anchorDate?: string | null;
  };

  if (!hasPublicDisplayAccess(body.accessToken ?? null)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.screenKey) {
    return Response.json({ error: "screenKey is required" }, { status: 400 });
  }

  const existing = await db.query.displayScreenHeartbeats.findFirst({
    where: eq(displayScreenHeartbeats.screenKey, body.screenKey),
  });

  if (existing) {
    await db
      .update(displayScreenHeartbeats)
      .set({
        playlistId: body.playlistId ?? null,
        screenLabel: body.screenLabel ?? null,
        lastTemplateSlug: body.templateSlug ?? null,
        lastPath: body.path ?? null,
        lastAnchorDate: body.anchorDate ?? null,
        lastSeenAt: new Date(),
        metadata: {
          source: "kiosk-heartbeat",
        },
        updatedAt: new Date(),
      })
      .where(eq(displayScreenHeartbeats.id, existing.id));
  } else {
    await db.insert(displayScreenHeartbeats).values({
      playlistId: body.playlistId ?? null,
      screenKey: body.screenKey,
      screenLabel: body.screenLabel ?? null,
      lastTemplateSlug: body.templateSlug ?? null,
      lastPath: body.path ?? null,
      lastAnchorDate: body.anchorDate ?? null,
      lastSeenAt: new Date(),
      metadata: {
        source: "kiosk-heartbeat",
      },
    });
  }

  return Response.json({ ok: true });
}
