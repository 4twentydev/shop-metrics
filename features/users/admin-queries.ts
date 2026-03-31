import "server-only";

import { asc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getUserAdminPageData() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      activeRole: users.activeRole,
      status: users.status,
      hasPin: sql<boolean>`${users.pin} is not null`,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));

  return { users: allUsers };
}

export type UserAdminPageData = Awaited<ReturnType<typeof getUserAdminPageData>>;
export type UserRow = UserAdminPageData["users"][number];
