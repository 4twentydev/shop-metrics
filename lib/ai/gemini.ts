import "server-only";

import { env } from "@/lib/env";

type GeminiSchema = Record<string, unknown>;

export async function generateGeminiStructuredJson(input: {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: GeminiSchema;
  fileParts: Array<{
    mimeType: "application/pdf";
    dataBase64: string;
  }>;
}) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: input.systemPrompt },
              { text: input.userPrompt },
              ...input.fileParts.map((part) => ({
                inline_data: {
                  mime_type: part.mimeType,
                  data: part.dataBase64,
                },
              })),
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: input.responseSchema,
          temperature: 0.1,
        },
      }),
    },
  );

  const raw = await response.json();

  if (!response.ok) {
    throw new Error(
      raw?.error?.message ?? "Gemini request failed without a detailed error.",
    );
  }

  const text = raw?.candidates?.[0]?.content?.parts?.find(
    (part: { text?: string }) => typeof part.text === "string",
  )?.text;

  if (!text) {
    throw new Error("Gemini returned no structured text payload.");
  }

  return {
    raw,
    parsed: JSON.parse(text) as unknown,
  };
}
