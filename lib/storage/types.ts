export type StoredPdf = {
  storageProvider: "local" | "vercel-blob";
  storageKey: string;
  storageUrl: string | null;
  byteSize: number;
};

export type StoredFile = StoredPdf;

export type StorePdfInput = {
  buffer: Buffer;
  checksumSha256: string;
  contentType: "application/pdf";
  fileName: string;
  releaseId: string;
};

export type StoreFileInput = {
  buffer: Buffer;
  checksumSha256: string;
  contentType: string;
  fileName: string;
  namespace: string;
};

export interface FileStorage {
  storePdf(input: StorePdfInput): Promise<StoredPdf>;
  readPdf(storageKey: string): Promise<Buffer>;
  storeFile(input: StoreFileInput): Promise<StoredFile>;
  readFile(storageKey: string): Promise<Buffer>;
}
