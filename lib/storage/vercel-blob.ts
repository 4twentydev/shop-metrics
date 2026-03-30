import "server-only";

import { head, put } from "@vercel/blob";

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

  async readPdf(storageKey: string) {
    const blob = await head(storageKey, {
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    const response = await fetch(blob.downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to read blob ${storageKey}.`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
