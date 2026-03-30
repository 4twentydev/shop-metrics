import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getMetricTargetAdminList } from "@/features/metrics/queries";
import { getActiveReadinessNotifications } from "@/features/releases/readiness-notifications";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import {
  metricTargetVersions,
  notificationDeliveries,
  reportExportDeliveries,
  reportTemplateVersions,
  reportTemplates,
  users,
} from "@/lib/db/schema";

import { getDisplayHeartbeatAdminData, getDisplayPlaylists } from "./display-queries";
import { getSavedReportTemplates } from "./queries";

export async function getReportingAdminPageData() {
  const [targets, archivedTargets, templates, archivedTemplates, deliveries, targetChanges, templateChanges, playlists, heartbeats, notificationEvents, notificationDeliveryRows] = await Promise.all([
    getMetricTargetAdminList(),
    getMetricTargetAdminList({ includeDeleted: true, deletedOnly: true }),
    getSavedReportTemplates(),
    db
      .select({
        id: reportTemplates.id,
        name: reportTemplates.name,
        slug: reportTemplates.slug,
        description: reportTemplates.description,
        viewType: reportTemplates.viewType,
        defaultWindowType: reportTemplates.defaultWindowType,
        scopeType: reportTemplates.scopeType,
        scopeReferenceId: reportTemplates.scopeReferenceId,
        scopeKey: reportTemplates.scopeKey,
        sectionConfig: reportTemplates.sectionConfig,
        isPinned: reportTemplates.isPinned,
        deletedAt: reportTemplates.deletedAt,
        deletionReason: reportTemplates.deletionReason,
      })
      .from(reportTemplates)
      .where(sql`${reportTemplates.deletedAt} is not null`),
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
        packageManifest: reportExportDeliveries.packageManifest,
        deliveredAt: reportExportDeliveries.deliveredAt,
        requestedByName: users.name,
      })
      .from(reportExportDeliveries)
      .leftJoin(users, eq(reportExportDeliveries.requestedByUserId, users.id))
      .orderBy(desc(reportExportDeliveries.createdAt))
      .limit(20),
    db
      .select({
        id: metricTargetVersions.id,
        targetId: metricTargetVersions.metricTargetId,
        changeAction: metricTargetVersions.changeAction,
        createdAt: metricTargetVersions.createdAt,
        changedByName: users.name,
      })
      .from(metricTargetVersions)
      .leftJoin(users, eq(metricTargetVersions.changedByUserId, users.id))
      .orderBy(desc(metricTargetVersions.createdAt))
      .limit(10),
    db
      .select({
        id: reportTemplateVersions.id,
        templateId: reportTemplateVersions.reportTemplateId,
        changeAction: reportTemplateVersions.changeAction,
        createdAt: reportTemplateVersions.createdAt,
        changedByName: users.name,
      })
      .from(reportTemplateVersions)
      .leftJoin(users, eq(reportTemplateVersions.changedByUserId, users.id))
      .orderBy(desc(reportTemplateVersions.createdAt))
      .limit(10),
    getDisplayPlaylists(),
    getDisplayHeartbeatAdminData(),
    getActiveReadinessNotifications(),
    db
      .select({
        id: notificationDeliveries.id,
        recipient: notificationDeliveries.recipient,
        channel: notificationDeliveries.channel,
        status: notificationDeliveries.status,
        sentAt: notificationDeliveries.sentAt,
        errorMessage: notificationDeliveries.errorMessage,
      })
      .from(notificationDeliveries)
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(20),
  ]);

  const archivedTemplateRows = archivedTemplates.filter((template) => template.deletedAt);

  return {
    targets,
    archivedTargets,
    templates,
    archivedTemplates: archivedTemplateRows,
    deliveries,
    targetChanges,
    templateChanges,
    playlists,
    heartbeats,
    notificationEvents,
    notificationDeliveryRows,
    displayAccessConfigured: Boolean(env.DISPLAY_ACCESS_TOKEN),
  };
}

export async function getPinnedTemplateBySlug(slug: string) {
  const template = await db.query.reportTemplates.findFirst({
    where: and(eq(reportTemplates.slug, slug), isNull(reportTemplates.deletedAt)),
  });

  if (!template || !template.isPinned) {
    return null;
  }

  return template;
}
