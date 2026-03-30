import "server-only";

import { desc, eq } from "drizzle-orm";

import { getMetricTargetAdminList } from "@/features/metrics/queries";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import {
  reportExportDeliveries,
  reportTemplates,
  users,
} from "@/lib/db/schema";

import { getSavedReportTemplates } from "./queries";

export async function getReportingAdminPageData() {
  const [targets, templates, deliveries] = await Promise.all([
    getMetricTargetAdminList(),
    getSavedReportTemplates(),
    db
      .select({
        id: reportExportDeliveries.id,
        reportView: reportExportDeliveries.reportView,
        windowType: reportExportDeliveries.windowType,
        windowStart: reportExportDeliveries.windowStart,
        windowEnd: reportExportDeliveries.windowEnd,
        scopeKey: reportExportDeliveries.scopeKey,
        packageType: reportExportDeliveries.packageType,
        requestedFormats: reportExportDeliveries.requestedFormats,
        requestedDatasets: reportExportDeliveries.requestedDatasets,
        primaryFileName: reportExportDeliveries.primaryFileName,
        rowCount: reportExportDeliveries.rowCount,
        byteSize: reportExportDeliveries.byteSize,
        status: reportExportDeliveries.status,
        storageProvider: reportExportDeliveries.storageProvider,
        storageKey: reportExportDeliveries.storageKey,
        deliveredAt: reportExportDeliveries.deliveredAt,
        requestedByName: users.name,
      })
      .from(reportExportDeliveries)
      .leftJoin(users, eq(reportExportDeliveries.requestedByUserId, users.id))
      .orderBy(desc(reportExportDeliveries.createdAt))
      .limit(20),
  ]);

  return {
    targets,
    templates,
    deliveries,
    displayAccessConfigured: Boolean(env.DISPLAY_ACCESS_TOKEN),
  };
}

export async function getPinnedTemplateBySlug(slug: string) {
  const template = await db.query.reportTemplates.findFirst({
    where: eq(reportTemplates.slug, slug),
  });

  if (!template || !template.isPinned) {
    return null;
  }

  return template;
}
