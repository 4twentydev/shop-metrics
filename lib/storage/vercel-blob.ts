import "server-only";

import { put } from "@vercel/blob";

import { env } from "@/lib/env";
import type { FileStorage, StorePdfInput } from "@/lib/storage/types";

export class VercelBlobStorage implements FileStorage {
  async storePdf(input: StorePdfInput) {
    const blob = await put(
      `job-releases/${input.releaseId}/${input.checksumSha256}-${input.fileName}`,
      input.buffer,
      {
        access: "private",
        contentType: input.contentType,
        token: env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
      },
    );

    return {
      storageProvider: "vercel-blob" as const,
      storageKey: blob.pathname,
      storageUrl: null,
      byteSize: input.buffer.byteLength,
    };
  }
}
