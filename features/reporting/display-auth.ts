import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

function asBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

export function hasPublicDisplayAccess(accessToken: string | null) {
  if (!env.DISPLAY_ACCESS_TOKEN || !accessToken) {
    return false;
  }

  const expected = asBuffer(env.DISPLAY_ACCESS_TOKEN);
  const received = asBuffer(accessToken);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
