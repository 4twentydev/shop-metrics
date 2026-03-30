"use client";

import { useDeferredValue, useState } from "react";

import { uploadReleaseDocumentsAction } from "@/features/release-intake/actions";

type ReleaseOption = {
  releaseId: string;
  jobNumber: string;
  releaseCode: string;
  revisionCode: string;
  productName: string;
};

type UploadBatchFormProps = {
  releases: ReleaseOption[];
};

type ManifestDraft = {
  index: number;
  fileName: string;
  kind: "BASELINE_PDF" | "REVISION_PDF" | "ROUTER_PDF" | "QUALITY_PDF";
  documentFamily: string;
  affectsBaseline: boolean;
  uploaderNotes: string;
};

const documentKinds: ManifestDraft["kind"][] = [
  "BASELINE_PDF",
  "REVISION_PDF",
  "ROUTER_PDF",
  "QUALITY_PDF",
];

export function UploadBatchForm({ releases }: UploadBatchFormProps) {
  const [manifest, setManifest] = useState<ManifestDraft[]>([]);
  const deferredManifest = useDeferredValue(manifest);

  return (
    <form
      action={uploadReleaseDocumentsAction}
      className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            Release intake
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Upload and group related release documents
          </h2>
        </div>
        <div className="rounded-2xl border border-line/80 bg-white/[0.03] px-4 py-3 text-sm text-muted">
          Multi-document intake with manual supersede review
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="grid gap-2 text-sm">
          <span className="text-muted">Release</span>
          <select
            name="jobReleaseId"
            required
            className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
          >
            <option value="">Select release</option>
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>
                {release.jobNumber} · {release.releaseCode} rev {release.revisionCode} ·{" "}
                {release.productName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted">Upload label</span>
          <input
            name="uploadLabel"
            placeholder="Example: revised panel packet"
            className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
            required
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm">
        <span className="text-muted">Batch notes</span>
        <textarea
          name="notes"
          rows={3}
          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
        />
      </label>

      <label className="mt-4 grid gap-2 text-sm">
        <span className="text-muted">PDF documents</span>
        <input
          type="file"
          name="documents"
          multiple
          accept="application/pdf"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setManifest(
              files.map((file, index) => ({
                index,
                fileName: file.name,
                kind: "REVISION_PDF",
                documentFamily: file.name
                  .replace(/\.pdf$/i, "")
                  .toUpperCase()
                  .replace(/[^A-Z0-9]+/g, "_")
                  .slice(0, 64),
                affectsBaseline: true,
                uploaderNotes: "",
              })),
            );
          }}
          className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3"
        />
      </label>

      <input
        type="hidden"
        name="documentManifest"
        value={JSON.stringify(
          deferredManifest.map(({ fileName: _fileName, ...item }) => item),
        )}
      />

      <div className="mt-6 space-y-4">
        {deferredManifest.map((item, index) => (
          <div
            key={`${item.fileName}-${index}`}
            className="rounded-2xl border border-line/80 bg-white/[0.03] p-4"
          >
            <p className="text-sm font-semibold">{item.fileName}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[0.28fr_0.32fr_0.2fr_0.2fr]">
              <label className="grid gap-2 text-sm">
                <span className="text-muted">Kind</span>
                <select
                  value={item.kind}
                  onChange={(event) => {
                    setManifest((current) =>
                      current.map((entry) =>
                        entry.index === item.index
                          ? {
                              ...entry,
                              kind: event.target.value as ManifestDraft["kind"],
                            }
                          : entry,
                      ),
                    );
                  }}
                  className="rounded-2xl border border-line bg-panel px-4 py-3"
                >
                  {documentKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted">Family key</span>
                <input
                  value={item.documentFamily}
                  onChange={(event) => {
                    setManifest((current) =>
                      current.map((entry) =>
                        entry.index === item.index
                          ? {
                              ...entry,
                              documentFamily: event.target.value,
                            }
                          : entry,
                      ),
                    );
                  }}
                  className="rounded-2xl border border-line bg-panel px-4 py-3"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={item.affectsBaseline}
                  onChange={(event) => {
                    setManifest((current) =>
                      current.map((entry) =>
                        entry.index === item.index
                          ? {
                              ...entry,
                              affectsBaseline: event.target.checked,
                            }
                          : entry,
                      ),
                    );
                  }}
                />
                <span>Affects baseline</span>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted">Uploader notes</span>
                <input
                  value={item.uploaderNotes}
                  onChange={(event) => {
                    setManifest((current) =>
                      current.map((entry) =>
                        entry.index === item.index
                          ? {
                              ...entry,
                              uploaderNotes: event.target.value,
                            }
                          : entry,
                      ),
                    );
                  }}
                  className="rounded-2xl border border-line bg-panel px-4 py-3"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"
      >
        Upload intake batch
      </button>
    </form>
  );
}
