"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { reportTemplates } from "@/lib/db/schema";

import { resolveReportScopeReferenceId } from "./queries";
import { checkboxValue, optionalString, reportTemplateSchema } from "./schemas";

export async function saveReportTemplateAction(formData: FormData) {
  const session = await requireOpsRole();
  const parsed = reportTemplateSchema.parse({
    templateId: optionalString(formData, "templateId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: optionalString(formData, "description"),
    viewType: formData.get("viewType"),
    defaultWindowType: formData.get("defaultWindowType"),
    scopeType: optionalString(formData, "scopeType"),
    scopeKey: optionalString(formData, "scopeKey"),
    includeSummary: checkboxValue(formData, "includeSummary"),
    includeRaw: checkboxValue(formData, "includeRaw"),
    includePivot: checkboxValue(formData, "includePivot"),
    highlightAccountability: checkboxValue(formData, "highlightAccountability"),
    highlightBottlenecks: checkboxValue(formData, "highlightBottlenecks"),
    mobileCondensed: checkboxValue(formData, "mobileCondensed"),
    isPinned: checkboxValue(formData, "isPinned"),
  });

  const scopeReferenceId = await resolveReportScopeReferenceId({
    scopeType: parsed.scopeType ?? null,
    scopeKey: parsed.scopeKey ?? null,
  });

  const sectionConfig = {
    includeSummary: parsed.includeSummary,
    includeRaw: parsed.includeRaw,
    includePivot: parsed.includePivot,
    highlightAccountability: parsed.highlightAccountability,
    highlightBottlenecks: parsed.highlightBottlenecks,
    mobileCondensed: parsed.mobileCondensed,
  };

  if (parsed.templateId) {
    const previous = await db.query.reportTemplates.findFirst({
      where: eq(reportTemplates.id, parsed.templateId),
    });

    await db
      .update(reportTemplates)
      .set({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        viewType: parsed.viewType,
        defaultWindowType: parsed.defaultWindowType,
        scopeType: parsed.scopeType ?? null,
        scopeReferenceId,
        scopeKey: parsed.scopeKey ?? null,
        sectionConfig,
        isPinned: parsed.isPinned,
        updatedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(reportTemplates.id, parsed.templateId));

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "report-template.updated",
      entityType: "report_template",
      entityId: parsed.templateId,
      beforeState: previous ?? null,
      afterState: {
        slug: parsed.slug,
        viewType: parsed.viewType,
        defaultWindowType: parsed.defaultWindowType,
      },
    });
  } else {
    const inserted = await db
      .insert(reportTemplates)
      .values({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        viewType: parsed.viewType,
        defaultWindowType: parsed.defaultWindowType,
        scopeType: parsed.scopeType ?? null,
        scopeReferenceId,
        scopeKey: parsed.scopeKey ?? null,
        sectionConfig,
        isPinned: parsed.isPinned,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
      })
      .returning({ id: reportTemplates.id });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "report-template.created",
      entityType: "report_template",
      entityId: inserted[0]!.id,
      afterState: {
        slug: parsed.slug,
        viewType: parsed.viewType,
        defaultWindowType: parsed.defaultWindowType,
      },
    });
  }

  revalidatePath("/ops/reports");
}

export async function deleteReportTemplateAction(formData: FormData) {
  const session = await requireOpsRole();
  const templateId = String(formData.get("templateId") ?? "");

  const existing = await db.query.reportTemplates.findFirst({
    where: eq(reportTemplates.id, templateId),
  });

  if (!existing) {
    throw new Error("Template not found.");
  }

  await db.delete(reportTemplates).where(eq(reportTemplates.id, templateId));

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "report-template.deleted",
    entityType: "report_template",
    entityId: templateId,
    beforeState: existing,
  });

  revalidatePath("/ops/reports");
  revalidatePath("/ops/reports/admin");
}
