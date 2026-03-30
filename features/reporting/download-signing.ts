import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

function signPayload(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("hex");
}

export function createSignedDownloadQuery(input: {
  deliveryId: string;
  expiresAt: string;
}) {
  const payload = `${input.deliveryId}:${input.expiresAt}`;
  return new URLSearchParams({
    expires: input.expiresAt,
    signature: signPayload(payload),
  }).toString();
}

export function verifySignedDownload(input: {
  deliveryId: string;
  expiresAt: string;
  signature: string;
}) {
  const expiresMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
    return false;
  }

  const expected = signPayload(`${input.deliveryId}:${input.expiresAt}`);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
