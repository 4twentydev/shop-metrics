import "server-only";

type ExtractionPlaybook = {
  key: string;
  label: string;
  checklist: string[];
  allowedFailureReasons: Array<
    | "DOCUMENT_SET_INVALID"
    | "OCR_QUALITY"
    | "MODEL_FAILURE"
    | "NORMALIZATION_ERROR"
    | "TIMEOUT"
    | "HUMAN_REVIEW_REQUIRED"
    | "UNKNOWN"
  >;
};

const REVISION_PDF_PLAYBOOK: ExtractionPlaybook = {
  key: "REVISION_PDF",
  label: "Revision packet",
  checklist: [
    "Confirm revision notes explain the release delta.",
    "Confirm revised totals reconcile with the stale baseline review.",
    "Reject if supersede intent is unclear across revision families.",
  ],
  allowedFailureReasons: [
    "DOCUMENT_SET_INVALID",
    "OCR_QUALITY",
    "HUMAN_REVIEW_REQUIRED",
    "NORMALIZATION_ERROR",
  ],
};

const playbooks: Record<string, ExtractionPlaybook> = {
  BASELINE_PDF: {
    key: "BASELINE_PDF",
    label: "Baseline packet",
    checklist: [
      "Confirm expected panels matches the approved baseline packet.",
      "Confirm due dates and revision notes are present before approval.",
      "Reject if baseline-affecting pages are missing or illegible.",
    ],
    allowedFailureReasons: [
      "DOCUMENT_SET_INVALID",
      "OCR_QUALITY",
      "NORMALIZATION_ERROR",
      "HUMAN_REVIEW_REQUIRED",
    ],
  },
  REVISION_PDF: REVISION_PDF_PLAYBOOK,
  ROUTER_PDF: {
    key: "ROUTER_PDF",
    label: "Router packet",
    checklist: [
      "Confirm router totals align with release totals.",
      "Confirm part-family mapping remains intact.",
    ],
    allowedFailureReasons: [
      "DOCUMENT_SET_INVALID",
      "NORMALIZATION_ERROR",
      "HUMAN_REVIEW_REQUIRED",
    ],
  },
  QUALITY_PDF: {
    key: "QUALITY_PDF",
    label: "Quality attachment",
    checklist: [
      "Confirm quality attachments do not change baseline metrics by themselves.",
      "Reject only if the attachment blocks interpretation of a baseline-affecting packet.",
    ],
    allowedFailureReasons: [
      "DOCUMENT_SET_INVALID",
      "HUMAN_REVIEW_REQUIRED",
      "UNKNOWN",
    ],
  },
};

export function buildPlaybookFromDocumentKinds(kinds: string[]) {
  const orderedKinds = [...new Set(kinds)].sort();
  const primaryKind = orderedKinds[0] ?? "REVISION_PDF";
  const primary = playbooks[primaryKind] ?? REVISION_PDF_PLAYBOOK;

  return {
    ...primary,
    key: orderedKinds.join("+"),
  };
}

export function buildDocumentFamilySignature(documents: Array<{ kind: string; documentFamily: string }>) {
  return documents
    .map((document) => `${document.kind}:${document.documentFamily}`)
    .sort()
    .join("|");
}
