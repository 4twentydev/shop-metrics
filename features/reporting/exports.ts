import "server-only";

import { createHash } from "node:crypto";

import { writeAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { reportExportArtifacts, reportExportDeliveries } from "@/lib/db/schema";
import { fileStorage } from "@/lib/storage";
import { formatNumber } from "@/lib/utils";

import type { ReportDataset, ReportExportFormat, ReportViewModel } from "./types";
import { calculateExpiry } from "./retention";

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

function toBuffer(body: string | Buffer) {
  return typeof body === "string" ? Buffer.from(body, "utf-8") : body;
}

function tarPad(size: number) {
  const remainder = size % 512;
  return remainder === 0 ? 0 : 512 - remainder;
}

function writeTarHeader(input: { fileName: string; size: number; mode?: string }) {
  const header = Buffer.alloc(512, 0);
  const writeString = (value: string, offset: number, length: number) => {
    header.write(value.slice(0, length), offset, Math.min(length, Buffer.byteLength(value)));
  };
  const writeOctal = (value: number, offset: number, length: number) => {
    const normalized = value.toString(8).padStart(length - 1, "0");
    header.write(`${normalized}\0`, offset, length, "ascii");
  };

  writeString(input.fileName, 0, 100);
  writeOctal(Number.parseInt(input.mode ?? "644", 8), 100, 8);
  writeOctal(0, 108, 8);
  writeOctal(0, 116, 8);
  writeOctal(input.size, 124, 12);
  writeOctal(Math.floor(Date.now() / 1000), 136, 12);
  header.fill(" ", 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString("ustar", 257, 6);
  writeString("00", 263, 2);

  let checksum = 0;
  for (const byte of header.values()) {
    checksum += byte;
  }

  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

function buildTarArchive(
  files: Array<{
    fileName: string;
    body: Buffer;
  }>,
) {
  const chunks: Buffer[] = [];

  for (const file of files) {
    chunks.push(writeTarHeader({ fileName: file.fileName, size: file.body.byteLength }));
    chunks.push(file.body);
    const padding = tarPad(file.body.byteLength);
    if (padding > 0) {
      chunks.push(Buffer.alloc(padding, 0));
    }
  }

  chunks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(chunks);
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

export async function recordReportDelivery(input: {
  report: ReportViewModel;
  templateId?: string | null;
  packageType: "SINGLE" | "BUNDLE";
  requestedFormats: ReportExportFormat[];
  requestedDatasets: ReportDataset[];
  primaryFileName: string;
  primaryContentType: string;
  byteSize: number;
  rowCount: number;
  packageManifest: Record<string, unknown>;
  storageProvider?: string | null;
  storageKey?: string | null;
  storageUrl?: string | null;
  retentionDays?: number;
  requestedByUserId?: string | null;
}) {
  const deliveredAt = new Date();
  const retentionDays = input.retentionDays ?? 30;
  const inserted = await db
    .insert(reportExportDeliveries)
    .values({
      reportView: input.report.view,
      windowType: input.report.range.windowType,
      windowStart: input.report.range.windowStart,
      windowEnd: input.report.range.windowEnd,
      scopeType: input.report.templateDefaults.scopeType,
      scopeKey: input.report.templateDefaults.scopeKey,
      templateId: input.templateId ?? null,
      packageType: input.packageType,
      requestedFormats: input.requestedFormats,
      requestedDatasets: input.requestedDatasets,
      packageManifest: input.packageManifest,
      primaryFileName: input.primaryFileName,
      primaryContentType: input.primaryContentType,
      storageProvider: input.storageProvider ?? null,
      storageKey: input.storageKey ?? null,
      storageUrl: input.storageUrl ?? null,
      byteSize: input.byteSize,
      rowCount: input.rowCount,
      retentionDays,
      expiresAt: calculateExpiry({
        deliveredAt,
        retentionDays,
      }),
      requestedByUserId: input.requestedByUserId ?? null,
      deliveredAt,
    })
    .returning({ id: reportExportDeliveries.id });

  return inserted[0]!;
}

export async function recordReportArtifacts(input: {
  deliveryId: string;
  artifacts: Array<{
    artifactType: "PRIMARY" | "BUNDLE_MEMBER";
    dataset?: string | null;
    format?: string | null;
    fileName: string;
    contentType: string;
    storageProvider?: string | null;
    storageKey?: string | null;
    storageUrl?: string | null;
    checksumSha256?: string | null;
    byteSize?: number | null;
    retentionDays?: number | null;
    expiresAt?: Date | null;
    manifestEntry?: Record<string, unknown> | null;
  }>;
}) {
  if (input.artifacts.length === 0) {
    return;
  }

  await db.insert(reportExportArtifacts).values(
    input.artifacts.map((artifact) => ({
      deliveryId: input.deliveryId,
      artifactType: artifact.artifactType,
      dataset: artifact.dataset ?? null,
      format: artifact.format ?? null,
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      storageProvider: artifact.storageProvider ?? null,
      storageKey: artifact.storageKey ?? null,
      storageUrl: artifact.storageUrl ?? null,
      checksumSha256: artifact.checksumSha256 ?? null,
      byteSize: artifact.byteSize ?? null,
      retentionDays: artifact.retentionDays ?? 30,
      expiresAt: artifact.expiresAt ?? null,
      manifestEntry: artifact.manifestEntry ?? null,
    })),
  );
}

export async function storeReportArtifact(input: {
  fileName: string;
  contentType: string;
  body: string | Buffer;
  checksumSha256: string;
  reportView: string;
  windowType: string;
  windowStart: string;
}) {
  const buffer =
    typeof input.body === "string" ? Buffer.from(input.body, "utf-8") : input.body;

  return fileStorage.storeFile({
    buffer,
    checksumSha256: input.checksumSha256,
    contentType: input.contentType,
    fileName: input.fileName,
    namespace: `report-exports/${input.reportView.toLowerCase()}/${input.windowType.toLowerCase()}/${input.windowStart}`,
  });
}

export async function buildAndStoreReportBundle(input: {
  report: ReportViewModel;
  formats: ReportExportFormat[];
  datasets: ReportDataset[];
  templateId?: string | null;
  requestedByUserId?: string | null;
}) {
  const members = [];

  for (const dataset of input.datasets) {
    for (const format of input.formats) {
      const artifact = await buildExportArtifact({
        report: input.report,
        format,
        dataset,
        actorUserId: input.requestedByUserId ?? null,
      });
      const buffer = toBuffer(artifact.body);
      const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
      const stored = await storeReportArtifact({
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        body: buffer,
        checksumSha256,
        reportView: input.report.view,
        windowType: input.report.range.windowType,
        windowStart: input.report.range.windowStart,
      });

      members.push({
        dataset,
        format,
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        body: buffer,
        checksumSha256,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        storageUrl: stored.storageUrl,
      });
    }
  }

  const archiveFileName = `${input.report.view.toLowerCase()}-${input.report.range.windowType.toLowerCase()}-${input.report.range.windowStart}-bundle.tar`;
  const archiveBody = buildTarArchive(
    members.map((member) => ({
      fileName: member.fileName,
      body: member.body,
    })),
  );
  const archiveChecksum = createHash("sha256").update(archiveBody).digest("hex");
  const storedArchive = await storeReportArtifact({
    fileName: archiveFileName,
    contentType: "application/x-tar",
    body: archiveBody,
    checksumSha256: archiveChecksum,
    reportView: input.report.view,
    windowType: input.report.range.windowType,
    windowStart: input.report.range.windowStart,
  });

  const delivery = await recordReportDelivery({
    report: input.report,
    templateId: input.templateId ?? null,
    packageType: "BUNDLE",
    requestedFormats: input.formats,
    requestedDatasets: input.datasets,
    primaryFileName: archiveFileName,
    primaryContentType: "application/x-tar",
    storageProvider: storedArchive.storageProvider,
    storageKey: storedArchive.storageKey,
    storageUrl: storedArchive.storageUrl,
    byteSize: archiveBody.byteLength,
    rowCount: members.length,
    packageManifest: {
      archiveFileName,
      members: members.map((member) => ({
        dataset: member.dataset,
        format: member.format,
        fileName: member.fileName,
        contentType: member.contentType,
        checksumSha256: member.checksumSha256,
      })),
    },
    retentionDays: 90,
    requestedByUserId: input.requestedByUserId ?? null,
  });

  await recordReportArtifacts({
    deliveryId: delivery.id,
    artifacts: [
      {
        artifactType: "PRIMARY",
        fileName: archiveFileName,
        contentType: "application/x-tar",
        storageProvider: storedArchive.storageProvider,
        storageKey: storedArchive.storageKey,
        storageUrl: storedArchive.storageUrl,
        checksumSha256: archiveChecksum,
        byteSize: archiveBody.byteLength,
        retentionDays: 90,
        expiresAt: calculateExpiry({
          deliveredAt: new Date(),
          retentionDays: 90,
        }),
        manifestEntry: {
          type: "bundle",
          memberCount: members.length,
        },
      },
      ...members.map((member) => ({
        artifactType: "BUNDLE_MEMBER" as const,
        dataset: member.dataset,
        format: member.format,
        fileName: member.fileName,
        contentType: member.contentType,
        storageProvider: member.storageProvider,
        storageKey: member.storageKey,
        storageUrl: member.storageUrl,
        checksumSha256: member.checksumSha256,
        byteSize: member.body.byteLength,
        retentionDays: 90,
        expiresAt: calculateExpiry({
          deliveredAt: new Date(),
          retentionDays: 90,
        }),
        manifestEntry: {
          dataset: member.dataset,
          format: member.format,
        },
      })),
    ],
  });

  return {
    deliveryId: delivery.id,
    fileName: archiveFileName,
    contentType: "application/x-tar",
    body: archiveBody,
  };
}
