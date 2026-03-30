import "server-only";

import { extractionAssistPayloadSchema } from "@/features/extraction/normalization";
import { generateGeminiStructuredJson } from "@/lib/ai/gemini";
import { fileStorage } from "@/lib/storage";

export async function extractReleaseSummaryWithGemini(input: {
  releaseLabel: string;
  documents: Array<{
    id: string;
    fileName: string;
    kind: string;
    documentFamily: string;
    storageKey: string;
  }>;
}) {
  const fileParts = await Promise.all(
    input.documents.map(async (document) => ({
      mimeType: "application/pdf" as const,
      dataBase64: (await fileStorage.readPdf(document.storageKey)).toString(
        "base64",
      ),
    })),
  );

  const responseSchema = {
    type: "object",
    properties: {
      releaseCode: { type: "string" },
      revisionCode: { type: "string" },
      customerName: { type: "string" },
      productName: { type: "string" },
      summary: {
        type: "object",
        properties: {
          expectedPanels: { type: "number" },
          releaseTotals: { type: "string" },
          materialTotals: { type: "string" },
          partTotals: { type: "string" },
          accessoryTotals: { type: "string" },
          dueDates: {
            type: "array",
            items: { type: "string" },
          },
          revisionNotes: {
            type: "array",
            items: { type: "string" },
          },
          additionalSummaryFields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
            },
          },
          confidence: { type: "number" },
        },
        required: [
          "expectedPanels",
          "releaseTotals",
          "materialTotals",
          "partTotals",
          "accessoryTotals",
          "dueDates",
          "revisionNotes",
          "additionalSummaryFields",
          "confidence",
        ],
      },
    },
    required: [
      "releaseCode",
      "revisionCode",
      "customerName",
      "productName",
      "summary",
    ],
  };

  const userPrompt = [
    `Extract one release-level summary for ${input.releaseLabel}.`,
    "Combine information across all supplied PDFs.",
    "Return only structured JSON matching the schema.",
    "Do not invent values. If a field is unclear, use the best concise summary from the docs.",
    "Document set:",
    ...input.documents.map(
      (document) =>
        `- ${document.fileName} (${document.kind}, family ${document.documentFamily})`,
    ),
  ].join("\n");

  const result = await generateGeminiStructuredJson({
    systemPrompt:
      "You are extracting structured manufacturing release summaries from panel-related PDFs. You assist reviewers and never approve anything.",
    userPrompt,
    responseSchema,
    fileParts,
  });

  return {
    rawOutput: result.raw,
    normalizedOutput: extractionAssistPayloadSchema.parse(result.parsed),
  };
}
