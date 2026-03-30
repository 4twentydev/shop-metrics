export type StoredPdf = {
  storageProvider: "local" | "vercel-blob";
  storageKey: string;
  storageUrl: string | null;
  byteSize: number;
};

export type StorePdfInput = {
  buffer: Buffer;
  checksumSha256: string;
  contentType: "application/pdf";
  fileName: string;
  releaseId: string;
};

export interface FileStorage {
  storePdf(input: StorePdfInput): Promise<StoredPdf>;
  readPdf(storageKey: string): Promise<Buffer>;
}
