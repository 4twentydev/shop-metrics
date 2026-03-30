import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import type { FileStorage, StorePdfInput } from "@/lib/storage/types";

export class LocalFileStorage implements FileStorage {
  async storePdf(input: StorePdfInput) {
    const datePrefix = new Date().toISOString().slice(0, 10);
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const relativePath = path.join(
      input.releaseId,
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
}
