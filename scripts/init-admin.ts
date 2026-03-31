/**
 * Bootstrap the initial admin account.
 *
 * Creates the user if they don't exist, sets their PIN, and marks them ACTIVE.
 * Safe to re-run — existing data is updated, not duplicated.
 *
 * Usage:
 *   DATABASE_URL=... SIGNING_SECRET=... tsx scripts/init-admin.ts
 *
 * Optional overrides via env vars:
 *   ADMIN_NAME    (default: "Admin")
 *   ADMIN_EMAIL   (default: "admin@example.com")
 *   ADMIN_PIN     (default: "0000")
 */

import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db, sql } from "@/lib/db/client";
import { users } from "@/lib/db/schema/auth";

const signingSecret = process.env["SIGNING_SECRET"];
if (!signingSecret) {
  console.error("Error: SIGNING_SECRET is required.");
  process.exit(1);
}

const name  = process.env["ADMIN_NAME"]  ?? "Admin";
const email = (process.env["ADMIN_EMAIL"] ?? "admin@example.com").toLowerCase().trim();
const pin   = process.env["ADMIN_PIN"]   ?? "0000";

if (!/^\d{4}$/.test(pin)) {
  console.error("Error: ADMIN_PIN must be exactly 4 digits.");
  process.exit(1);
}

function hashPin(p: string): string {
  return crypto.createHash("sha256").update(`${signingSecret}:${p}`).digest("hex");
}

const id = "usr_admin_bootstrap";

async function main() {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    await db
      .update(users)
      .set({ pin: hashPin(pin), status: "ACTIVE", activeRole: "platform_admin", updatedAt: new Date() })
      .where(eq(users.email, email));
    console.log(`Updated existing user: ${existing.name} <${email}>`);
  } else {
    await db.insert(users).values({
      id,
      name,
      email,
      status: "ACTIVE",
      activeRole: "platform_admin",
      pin: hashPin(pin),
    });
    console.log(`Created admin user: ${name} <${email}>`);
  }

  console.log(`PIN set to: ${pin}`);
  console.log("Done. Log in at /sign-in with this PIN.");

  await sql.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
