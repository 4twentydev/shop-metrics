import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __shopMetricsSql: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__shopMetricsSql ??
  postgres(env.DATABASE_URL, {
    prepare: false,
    max: env.NODE_ENV === "development" ? 5 : 10,
    ssl: "require",
  });

if (env.NODE_ENV !== "production") {
  globalThis.__shopMetricsSql = sql;
}

export const db = drizzle(sql, { schema });
export { sql };
