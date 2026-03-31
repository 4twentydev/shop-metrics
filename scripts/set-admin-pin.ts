/**
 * Bootstrap script: set a PIN for any user by email.
 * Run from the repo root:
 *
 *   SIGNING_SECRET=<your-secret> tsx scripts/set-admin-pin.ts <email> <pin>
 *
 * Example:
 *   SIGNING_SECRET=my-secret tsx scripts/set-admin-pin.ts morgan.reyes@elwardsystems.example 1001
 */

import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/auth";

const [email, pin] = process.argv.slice(2) as [string | undefined, string | undefined];

if (!email || !pin) {
  console.error("Usage: tsx scripts/set-admin-pin.ts <email> <pin>");
  process.exit(1);
}

if (!/^\d{4}$/.test(pin)) {
  console.error("PIN must be exactly 4 digits.");
  process.exit(1);
}

const signingSecret = process.env["SIGNING_SECRET"];
if (!signingSecret) {
  console.error("SIGNING_SECRET environment variable is required.");
  process.exit(1);
}

function hashPin(p: string): string {
  return crypto.createHash("sha256").update(`${signingSecret}:${p}`).digest("hex");
}

const result = await db
  .update(users)
  .set({ pin: hashPin(pin), status: "ACTIVE", updatedAt: new Date() })
  .where(eq(users.email, email.toLowerCase().trim()))
  .returning({ id: users.id, name: users.name, email: users.email });

if (!result[0]) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`PIN set for ${result[0].name} (${result[0].email})`);
await db.$client.end();
