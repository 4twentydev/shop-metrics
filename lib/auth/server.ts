import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMagicLinkEmail } from "@/lib/auth/magic-link";
import * as schema from "@/lib/db/schema";

const appOrigin = new URL(env.APP_URL).origin;
const authOrigin = new URL(env.BETTER_AUTH_URL).origin;

const vercelPreviewOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;
const vercelProductionOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;

const trustedOriginSet = new Set([
  env.BETTER_AUTH_TRUSTED_ORIGIN,
  appOrigin,
  authOrigin,
  ...(vercelPreviewOrigin ? [vercelPreviewOrigin] : []),
  ...(vercelProductionOrigin ? [vercelProductionOrigin] : []),
]);

const allowedHostSet = new Set(
  [...trustedOriginSet].map((origin) => new URL(origin).host),
);

allowedHostSet.add("localhost:3000");
allowedHostSet.add("127.0.0.1:3000");
allowedHostSet.add("*.vercel.app");

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [...allowedHostSet],
    fallback: env.BETTER_AUTH_URL,
  },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [...trustedOriginSet],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: false,
  },
  user: {
    additionalFields: {
      status: {
        type: "string",
        required: true,
        defaultValue: "INVITED",
        input: false,
      },
      activeRole: {
        type: "string",
        required: true,
        defaultValue: "employee",
        input: false,
      },
    },
  },
  plugins: [
    passkey({
      rpID: env.BETTER_AUTH_RP_ID,
      rpName: "Elward Systems Metrics",
    }),
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
  ],
});
