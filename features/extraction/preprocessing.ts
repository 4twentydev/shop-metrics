import "server-only";

type ExtractionDocument = {
  id: string;
  fileName: string;
  kind: string;
  documentFamily: string;
  storageKey: string;
  extractionStatus?: string | null;
};

const kindPriority: Record<string, number> = {
  BASELINE_PDF: 0,
  REVISION_PDF: 1,
  ROUTER_PDF: 2,
  QUALITY_PDF: 3,
};

function priorityForKind(kind: string) {
  return kindPriority[kind] ?? 9;
}

export function preprocessReleaseDocuments(input: {
  releaseLabel: string;
  documents: ExtractionDocument[];
}) {
  const orderedDocuments = [...input.documents].sort((left, right) => {
    const kindDelta = priorityForKind(left.kind) - priorityForKind(right.kind);
    if (kindDelta !== 0) {
      return kindDelta;
    }

    return left.fileName.localeCompare(right.fileName);
  });

  const families = Array.from(
    new Set(orderedDocuments.map((document) => document.documentFamily)),
  );

  const kindCounts = orderedDocuments.reduce<Record<string, number>>((acc, document) => {
    acc[document.kind] = (acc[document.kind] ?? 0) + 1;
    return acc;
  }, {});

  const promptSections = [
    `Release label: ${input.releaseLabel}`,
    "Document preprocessing rules:",
    "- Prefer baseline packets for release-level canonical totals when present.",
    "- Use revision packets to override stale or superseded details, but preserve revision notes explicitly.",
    "- Use router packets for operation and part-family hints.",
    "- Use quality packets only for supplemental notes, due-date clarification, or verification context.",
    "Ordered document set:",
    ...orderedDocuments.map(
      (document, index) =>
        `${index + 1}. ${document.fileName} | kind=${document.kind} | family=${document.documentFamily}`,
    ),
  ];

  return {
    orderedDocuments,
    promptSections,
    processingMetadata: {
      releaseLabel: input.releaseLabel,
      documentCount: orderedDocuments.length,
      kindCounts,
      families,
      preprocessingVersion: 1,
    },
  };
}
