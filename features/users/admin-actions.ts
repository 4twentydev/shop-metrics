"use server";

import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireRole } from "@/lib/auth/permissions";
import { hashPin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ROLE_SLUGS } from "@/lib/auth/roles";

const ROLE_VALUES = Object.values(ROLE_SLUGS) as string[];
const STATUS_VALUES = ["INVITED", "ACTIVE", "SUSPENDED"] as const;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") throw new Error(`Missing field: ${key}`);
  return value.trim();
}

export async function setUserPinAction(formData: FormData) {
  const session = await requireRole(["platform_admin"]);
  const userId = getString(formData, "userId");
  const pin = getString(formData, "pin");

  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) throw new Error("User not found.");

  await db
    .update(users)
    .set({ pin: hashPin(userId, pin), updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "user.pin-set",
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/ops/users");
}

export async function updateUserStatusAction(formData: FormData) {
  const session = await requireRole(["platform_admin"]);
  const userId = getString(formData, "userId");
  const status = getString(formData, "status") as (typeof STATUS_VALUES)[number];

  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Invalid status.");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) throw new Error("User not found.");

  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "user.status-updated",
    entityType: "user",
    entityId: userId,
    beforeState: { status: existing.status },
    afterState: { status },
  });

  revalidatePath("/ops/users");
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await requireRole(["platform_admin"]);
  const userId = getString(formData, "userId");
  const role = getString(formData, "activeRole");

  if (!ROLE_VALUES.includes(role)) {
    throw new Error("Invalid role.");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) throw new Error("User not found.");

  await db
    .update(users)
    .set({ activeRole: role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "user.role-updated",
    entityType: "user",
    entityId: userId,
    beforeState: { activeRole: existing.activeRole },
    afterState: { activeRole: role },
  });

  revalidatePath("/ops/users");
}

export async function createUserAction(formData: FormData) {
  const session = await requireRole(["platform_admin"]);
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const activeRole = getString(formData, "activeRole");
  const pin = getString(formData, "pin");

  if (!name) throw new Error("Name is required.");
  if (!email.includes("@")) throw new Error("Invalid email.");
  if (!ROLE_VALUES.includes(activeRole)) throw new Error("Invalid role.");
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits.");

  const id = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  await db.insert(users).values({
    id,
    name,
    email,
    status: "ACTIVE",
    activeRole,
    pin: hashPin(id, pin),
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "user.created",
    entityType: "user",
    entityId: id,
    afterState: { name, email, activeRole },
  });

  revalidatePath("/ops/users");
}
