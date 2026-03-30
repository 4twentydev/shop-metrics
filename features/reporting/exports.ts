import "server-only";

import { writeAuditLog } from "@/lib/audit/log";
import { formatNumber } from "@/lib/utils";

import type { ReportDataset, ReportExportFormat, ReportViewModel } from "./types";

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function rowsToCsv(columns: string[], rows: string[][]) {
  return [
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ].join("\n");
}

function rowsToSpreadsheetXml(title: string, columns: string[], rows: string[][]) {
  const headerCells = columns
    .map((column) => `<Cell><Data ss:Type="String">${column}</Data></Cell>`)
    .join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${cell}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${title}">
    <Table>
      <Row>${headerCells}</Row>
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function linesToPdf(title: string, lines: string[]) {
  const pageHeight = 792;
  const marginTop = 48;
  const lineHeight = 16;
  const bodyLines = [title, "", ...lines];
  const contentStream = [
    "BT",
    "/F1 12 Tf",
    `1 0 0 1 48 ${pageHeight - marginTop} Tm`,
    ...bodyLines.map((line, index) =>
      index === 0
        ? `(${escapePdfText(line)}) Tj`
        : `0 -${lineHeight} Td (${escapePdfText(line)}) Tj`,
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
  ];

  let output = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(output.length);
    output += `${object}\n`;
  }

  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, "binary");
}

function sectionForDataset(report: ReportViewModel, dataset: ReportDataset) {
  if (dataset === "raw") {
    return report.rawSection;
  }

  if (dataset === "pivot") {
    return report.pivotSection;
  }

  return {
    id: "summary",
    title: `${report.title} Summary`,
    description: report.description,
    columns: ["Metric", "Value", "Hint"],
    rows: report.summaryCards.map((card) => [card.label, card.value, card.hint]),
  };
}

export async function buildExportArtifact(input: {
  report: ReportViewModel;
  format: ReportExportFormat;
  dataset: ReportDataset;
  actorUserId?: string | null;
}) {
  const section = sectionForDataset(input.report, input.dataset);
  const slugBase = `${input.report.view.toLowerCase()}-${input.report.range.windowType.toLowerCase()}-${input.report.range.windowStart}`;

  await writeAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: "report.exported",
    entityType: "report_export",
    entityId: slugBase,
    metadata: {
      view: input.report.view,
      dataset: input.dataset,
      format: input.format,
      rowCount: section.rows.length,
    },
  });

  if (input.format === "csv") {
    return {
      body: rowsToCsv(section.columns, section.rows),
      contentType: "text/csv; charset=utf-8",
      fileName: `${slugBase}-${input.dataset}.csv`,
    };
  }

  if (input.format === "excel") {
    return {
      body: rowsToSpreadsheetXml(section.title, section.columns, section.rows),
      contentType: "application/vnd.ms-excel; charset=utf-8",
      fileName: `${slugBase}-${input.dataset}.xml`,
    };
  }

  if (input.format === "pdf") {
    const summaryLines = [
      `${input.report.scopeLabel} · ${input.report.range.windowType} ${input.report.range.windowStart} to ${input.report.range.windowEnd}`,
      ...input.report.summaryCards.map(
        (card) => `${card.label}: ${card.value} (${card.hint})`,
      ),
      "",
      `${section.title}: ${section.description}`,
      ...section.rows.slice(0, 24).map((row) => row.join(" | ")),
      "",
      `Rows exported: ${formatNumber(section.rows.length)}`,
    ];

    return {
      body: linesToPdf(input.report.title, summaryLines),
      contentType: "application/pdf",
      fileName: `${slugBase}-${input.dataset}.pdf`,
    };
  }

  if (input.format === "web") {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${input.report.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f3f4f6; }
    </style>
  </head>
  <body>
    <h1>${input.report.title}</h1>
    <p>${input.report.description}</p>
    <table>
      <thead>
        <tr>${section.columns.map((column) => `<th>${column}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${section.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

    return {
      body: html,
      contentType: "text/html; charset=utf-8",
      fileName: `${slugBase}-${input.dataset}.html`,
    };
  }

  return {
    body: rowsToCsv(section.columns, section.rows),
    contentType: "text/plain; charset=utf-8",
    fileName: `${slugBase}-${input.dataset}.txt`,
  };
}
