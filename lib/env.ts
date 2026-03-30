import "server-only";

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.string().url(),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_RP_ID: z.string().min(1),
    BETTER_AUTH_TRUSTED_ORIGIN: z.string().url(),
    AUTH_FROM_EMAIL: z.string().email(),
    RESEND_API_KEY: z.string().min(1).optional(),
    STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).default("local"),
    LOCAL_FILE_STORAGE_ROOT: z.string().min(1).default(".data/uploads"),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.STORAGE_DRIVER === "local") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "STORAGE_DRIVER=local is not allowed in production. Use vercel-blob.",
        path: ["STORAGE_DRIVER"],
      });
    }

    if (
      value.STORAGE_DRIVER === "vercel-blob" &&
      !value.BLOB_READ_WRITE_TOKEN
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "BLOB_READ_WRITE_TOKEN is required when STORAGE_DRIVER=vercel-blob.",
        path: ["BLOB_READ_WRITE_TOKEN"],
      });
    }

    if (value.NODE_ENV === "production" && !value.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "RESEND_API_KEY is required in production to deliver magic links.",
        path: ["RESEND_API_KEY"],
      });
    }
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_RP_ID: process.env.BETTER_AUTH_RP_ID,
  BETTER_AUTH_TRUSTED_ORIGIN: process.env.BETTER_AUTH_TRUSTED_ORIGIN,
  AUTH_FROM_EMAIL: process.env.AUTH_FROM_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
  LOCAL_FILE_STORAGE_ROOT: process.env.LOCAL_FILE_STORAGE_ROOT,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});

export type Env = typeof env;
