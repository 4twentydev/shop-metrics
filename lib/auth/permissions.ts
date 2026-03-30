import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { OPS_ROLES, type RoleSlug } from "@/lib/auth/roles";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
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
