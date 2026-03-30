import "server-only";

import { head, put } from "@vercel/blob";

import { env } from "@/lib/env";
import type { FileStorage, StoreFileInput, StorePdfInput } from "@/lib/storage/types";

export class VercelBlobStorage implements FileStorage {
  private async storeBuffer(input: StoreFileInput) {
    const blob = await put(
      `${input.namespace}/${input.checksumSha256}-${input.fileName}`,
      input.buffer,
      {
        access: "private",
        contentType: input.contentType,
        ...(env.BLOB_READ_WRITE_TOKEN !== undefined ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
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

  async storePdf(input: StorePdfInput) {
    return this.storeBuffer({
      ...input,
      namespace: `job-releases/${input.releaseId}`,
    });
  }

  async readPdf(storageKey: string) {
    const blob = await head(storageKey, {
      ...(env.BLOB_READ_WRITE_TOKEN !== undefined ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
    });
    const response = await fetch(blob.downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to read blob ${storageKey}.`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async storeFile(input: StoreFileInput) {
    return this.storeBuffer(input);
  }

  async readFile(storageKey: string) {
    const blob = await head(storageKey, {
      ...(env.BLOB_READ_WRITE_TOKEN !== undefined ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
    });
    const response = await fetch(blob.downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to read blob ${storageKey}.`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
