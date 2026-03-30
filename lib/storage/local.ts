import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import type { FileStorage, StoreFileInput, StorePdfInput } from "@/lib/storage/types";

export class LocalFileStorage implements FileStorage {
  private async storeBuffer(input: StoreFileInput) {
    const datePrefix = new Date().toISOString().slice(0, 10);
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const relativePath = path.join(
      input.namespace,
      datePrefix,
      `${input.checksumSha256}-${safeName}`,
    );
    const absolutePath = path.join(env.LOCAL_FILE_STORAGE_ROOT, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      storageProvider: "local" as const,
      storageKey: relativePath,
      storageUrl: null,
      byteSize: input.buffer.byteLength,
    };
  }

  async storePdf(input: StorePdfInput) {
    return this.storeBuffer({
      ...input,
      namespace: input.releaseId,
    });
  }

  async readPdf(storageKey: string) {
    const absolutePath = path.join(env.LOCAL_FILE_STORAGE_ROOT, storageKey);
    return readFile(absolutePath);
  }

  async storeFile(input: StoreFileInput) {
    return this.storeBuffer(input);
  }

  async readFile(storageKey: string) {
    const absolutePath = path.join(env.LOCAL_FILE_STORAGE_ROOT, storageKey);
    return readFile(absolutePath);
  }
}
