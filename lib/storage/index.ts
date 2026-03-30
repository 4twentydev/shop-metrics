import "server-only";

import { env } from "@/lib/env";
import { LocalFileStorage } from "@/lib/storage/local";
import { VercelBlobStorage } from "@/lib/storage/vercel-blob";

export const fileStorage =
  env.STORAGE_DRIVER === "vercel-blob"
    ? new VercelBlobStorage()
    : new LocalFileStorage();
