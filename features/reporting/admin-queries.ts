import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getMetricTargetAdminList } from "@/features/metrics/queries";
import { getActiveReadinessNotifications } from "@/features/releases/readiness-notifications";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import {
  metricTargetVersions,
  notificationEscalationPolicies,
  notificationDeliveries,
  notificationPreferences,
  reportExportDeliveries,
  reportTemplateVersions,
  reportTemplates,
  users,
} from "@/lib/db/schema";

import { createSignedDownloadQuery } from "./download-signing";
import { getDisplayHeartbeatAdminData, getDisplayPlaylists } from "./display-queries";
import { getDisplayMonitoringPageData } from "./display-alerts";
import { getSavedReportTemplates } from "./queries";

export async function getReportingAdminPageData() {
  const [targets, archivedTargets, templates, archivedTemplates, deliveries, targetChanges, templateChanges, playlists, heartbeats, notificationEvents, notificationDeliveryRows, displayMonitoring, notificationPrefs, escalationPolicies, userDirectory] = await Promise.all([
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
        retentionDays: reportExportDeliveries.retentionDays,
        expiresAt: reportExportDeliveries.expiresAt,
        cleanupStatus: reportExportDeliveries.cleanupStatus,
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
        eventType: notificationDeliveries.eventType,
        recipient: notificationDeliveries.recipient,
        channel: notificationDeliveries.channel,
        status: notificationDeliveries.status,
        sentAt: notificationDeliveries.sentAt,
        errorMessage: notificationDeliveries.errorMessage,
      })
      .from(notificationDeliveries)
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(20),
    getDisplayMonitoringPageData(),
    db
      .select({
        id: notificationPreferences.id,
        userId: notificationPreferences.userId,
        eventType: notificationPreferences.eventType,
        channel: notificationPreferences.channel,
        isEnabled: notificationPreferences.isEnabled,
        minimumRepeatMinutes: notificationPreferences.minimumRepeatMinutes,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(notificationPreferences.userId, users.id))
      .orderBy(desc(notificationPreferences.updatedAt)),
    db
      .select({
        id: notificationEscalationPolicies.id,
        eventType: notificationEscalationPolicies.eventType,
        channel: notificationEscalationPolicies.channel,
        roleSlug: notificationEscalationPolicies.roleSlug,
        escalationOrder: notificationEscalationPolicies.escalationOrder,
        repeatMinutes: notificationEscalationPolicies.repeatMinutes,
        isActive: notificationEscalationPolicies.isActive,
      })
      .from(notificationEscalationPolicies)
      .orderBy(
        notificationEscalationPolicies.eventType,
        notificationEscalationPolicies.channel,
        notificationEscalationPolicies.escalationOrder,
      ),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        activeRole: users.activeRole,
      })
      .from(users)
      .where(eq(users.status, "ACTIVE"))
      .orderBy(users.name),
  ]);

  const archivedTemplateRows = archivedTemplates.filter((template) => template.deletedAt);

  return {
    targets,
    archivedTargets,
    templates,
    archivedTemplates: archivedTemplateRows,
    deliveries: deliveries.map((delivery) => ({
      ...delivery,
      signedDownloadPath:
        delivery.packageType === "BUNDLE"
          ? `/api/reports/download/${delivery.id}?${createSignedDownloadQuery({
              deliveryId: delivery.id,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })}`
          : null,
    })),
    targetChanges,
    templateChanges,
    playlists,
    heartbeats,
    notificationEvents,
    notificationDeliveryRows,
    displayMonitoring,
    notificationPrefs,
    escalationPolicies,
    userDirectory,
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
