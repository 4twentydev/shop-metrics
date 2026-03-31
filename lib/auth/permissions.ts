import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { OPS_ROLES, type RoleSlug } from "@/lib/auth/roles";

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user) return null;
  return { user };
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireRole(allowedRoles: RoleSlug[]) {
  const session = await requireSession();
  const activeRole = session.user.activeRole;

  if (!allowedRoles.includes(activeRole as RoleSlug)) {
    redirect("/employee");
  }

  return session;
}

export async function requireOpsRole() {
  return requireRole(OPS_ROLES);
}
