import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMagicLinkEmail } from "@/lib/auth/magic-link";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_TRUSTED_ORIGIN],
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
