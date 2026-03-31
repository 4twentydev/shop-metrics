import "server-only";

import crypto from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema/auth";

export const SESSION_COOKIE = "session";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_MS / 1000,
};

/** Hash a PIN against a user ID as salt (SHA-256). */
export function hashPin(userId: string, pin: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${pin}`)
    .digest("hex");
}

/** Create a new session for a user and return the session token. */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt,
  });

  return token;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  activeRole: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
};

/** Look up a valid (non-expired) session and return the associated user. */
export async function getSessionUser(
  token: string,
): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      activeRole: users.activeRole,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

/** Delete a session by token. */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}
