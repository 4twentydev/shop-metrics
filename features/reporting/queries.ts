import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  departments,
  employees,
  jobReleases,
  jobs,
  reportTemplates,
} from "@/lib/db/schema";

import type { MetricScope } from "@/features/metrics/types";

import type { SavedReportTemplate } from "./types";

export async function getSavedReportTemplates() {
  const rows = await db
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
    })
    .from(reportTemplates)
    .orderBy(desc(reportTemplates.isPinned), asc(reportTemplates.name));

  return rows as SavedReportTemplate[];
}

export async function getReportTemplateById(templateId: string) {
  const row = await db.query.reportTemplates.findFirst({
    where: eq(reportTemplates.id, templateId),
  });

  return (row as SavedReportTemplate | undefined) ?? null;
}

export async function getDepartmentLookup() {
  return db
    .select({
      id: departments.id,
      code: departments.code,
      name: departments.name,
    })
    .from(departments)
    .orderBy(asc(departments.name));
}

export async function getEmployeeLookup() {
  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      displayName: employees.displayName,
    })
    .from(employees)
    .orderBy(asc(employees.displayName));
}

export async function getJobLookup() {
  return db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      productName: jobs.productName,
    })
    .from(jobs)
    .orderBy(asc(jobs.jobNumber));
}

export async function getReleaseLookup() {
  return db
    .select({
      id: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      partFamily: jobReleases.partFamily,
      jobNumber: jobs.jobNumber,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .orderBy(asc(jobs.jobNumber), asc(jobReleases.releaseCode));
}

export async function resolveReportScopeReferenceId(input: {
  scopeType: MetricScope | null;
  scopeKey: string | null;
}) {
  if (!input.scopeType || !input.scopeKey) {
    return null;
  }

  if (input.scopeType === "DEPARTMENT") {
    const row = await db.query.departments.findFirst({
      where: eq(departments.code, input.scopeKey),
    });
    return row?.id ?? null;
  }

  if (input.scopeType === "EMPLOYEE") {
    const row = await db.query.employees.findFirst({
      where: eq(employees.employeeCode, input.scopeKey),
    });
    return row?.id ?? null;
  }

  if (input.scopeType === "JOB") {
    const row = await db.query.jobs.findFirst({
      where: eq(jobs.jobNumber, input.scopeKey),
    });
    return row?.id ?? null;
  }

  if (input.scopeType === "RELEASE") {
    const row = await db.query.jobReleases.findFirst({
      where: eq(jobReleases.releaseCode, input.scopeKey),
    });
    return row?.id ?? null;
  }

  return null;
}
