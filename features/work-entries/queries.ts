import "server-only";

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import {
  getBusinessDateForShift,
  getDateStringForTimeZone,
} from "@/features/work-entries/business";
import { db } from "@/lib/db";
import {
  departments,
  employeeStationAssignments,
  employees,
  jobReleases,
  jobs,
  shiftSubmissions,
  shifts,
  stations,
  users,
  workEntries,
  workEntryComments,
  workEntryVersions,
} from "@/lib/db/schema";

async function getActiveAssignmentByUserId(userId: string) {
  const now = new Date();
  const rows = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.displayName,
      stationId: stations.id,
      stationCode: stations.code,
      stationName: stations.name,
      departmentId: departments.id,
      departmentCode: departments.code,
      departmentName: departments.name,
      nativeUnitLabel: departments.nativeUnitLabel,
      panelsPerNativeUnit: departments.panelsPerNativeUnit,
      shiftId: shifts.id,
      shiftCode: shifts.code,
      shiftName: shifts.name,
      shiftTimezone: shifts.timezone,
      shiftStartLocal: shifts.startLocal,
      shiftEndLocal: shifts.endLocal,
      shiftCrossesMidnight: shifts.crossesMidnight,
    })
    .from(employeeStationAssignments)
    .innerJoin(employees, eq(employeeStationAssignments.employeeId, employees.id))
    .innerJoin(stations, eq(employeeStationAssignments.stationId, stations.id))
    .innerJoin(
      departments,
      eq(stations.departmentId, departments.id),
    )
    .innerJoin(shifts, eq(employeeStationAssignments.shiftId, shifts.id))
    .where(
      and(
        eq(employees.userId, userId),
        lte(employeeStationAssignments.startsAt, now),
        or(
          isNull(employeeStationAssignments.endsAt),
          gte(employeeStationAssignments.endsAt, now),
        ),
      ),
    )
    .orderBy(desc(employeeStationAssignments.isPrimary), desc(employeeStationAssignments.startsAt))
    .limit(1);

  const assignment = rows[0];

  if (!assignment) {
    return null;
  }

  return {
    ...assignment,
    businessDate: getBusinessDateForShift(now, {
      timezone: assignment.shiftTimezone,
      startLocal: assignment.shiftStartLocal,
      endLocal: assignment.shiftEndLocal,
      crossesMidnight: assignment.shiftCrossesMidnight,
    }),
  };
}

export async function getActiveAssignmentForUser(userId: string) {
  return getActiveAssignmentByUserId(userId);
}

export async function getOrFindCurrentSubmission(userId: string) {
  const assignment = await getActiveAssignmentByUserId(userId);

  if (!assignment) {
    return null;
  }

  const submission = await db.query.shiftSubmissions.findFirst({
    where: and(
      eq(shiftSubmissions.employeeId, assignment.employeeId),
      eq(shiftSubmissions.shiftId, assignment.shiftId),
      eq(shiftSubmissions.stationId, assignment.stationId),
      eq(shiftSubmissions.businessDate, assignment.businessDate),
    ),
  });

  return { assignment, submission };
}

export async function getAvailableReleases() {
  return db
    .select({
      releaseId: jobReleases.id,
      releaseCode: jobReleases.releaseCode,
      revisionCode: jobReleases.revisionCode,
      releaseStatus: jobReleases.status,
      panelBaseline: jobReleases.panelBaseline,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      productName: jobs.productName,
    })
    .from(jobReleases)
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .where(inArray(jobReleases.status, ["READY", "IN_PRODUCTION"]))
    .orderBy(jobs.jobNumber, jobReleases.releaseCode);
}

export async function getSubmissionEntries(submissionId: string) {
  const entries = await db
    .select({
      id: workEntries.id,
      submissionId: workEntries.submissionId,
      jobReleaseId: workEntries.jobReleaseId,
      stationId: workEntries.stationId,
      departmentId: workEntries.departmentId,
      nativeUnitType: workEntries.nativeUnitType,
      nativeQuantity: workEntries.nativeQuantity,
      panelEquivalentQuantity: workEntries.panelEquivalentQuantity,
      businessDate: workEntries.businessDate,
      verificationStatus: workEntries.verificationStatus,
      isLocked: workEntries.isLocked,
      versionCount: workEntries.versionCount,
      editedAt: workEntries.editedAt,
      editReason: workEntries.editReason,
      verifiedAt: workEntries.verifiedAt,
      leadCommentCount: workEntries.leadCommentCount,
      isRework: workEntries.isRework,
      faultDepartmentId: workEntries.faultDepartmentId,
      fixingDepartmentId: workEntries.fixingDepartmentId,
      reworkNotes: workEntries.reworkNotes,
      releaseCode: jobReleases.releaseCode,
      revisionCode: jobReleases.revisionCode,
      jobNumber: jobs.jobNumber,
      customerName: jobs.customerName,
      productName: jobs.productName,
    })
    .from(workEntries)
    .innerJoin(jobReleases, eq(workEntries.jobReleaseId, jobReleases.id))
    .innerJoin(jobs, eq(jobReleases.jobId, jobs.id))
    .where(eq(workEntries.submissionId, submissionId))
    .orderBy(desc(workEntries.createdAt));

  const entryIds = entries.map((entry) => entry.id);

  const versions =
    entryIds.length > 0
      ? await db
          .select({
            id: workEntryVersions.id,
            workEntryId: workEntryVersions.workEntryId,
            versionNumber: workEntryVersions.versionNumber,
            changeType: workEntryVersions.changeType,
            note: workEntryVersions.note,
            changedByName: users.name,
            createdAt: workEntryVersions.createdAt,
          })
          .from(workEntryVersions)
          .leftJoin(users, eq(workEntryVersions.changedByUserId, users.id))
          .where(inArray(workEntryVersions.workEntryId, entryIds))
          .orderBy(desc(workEntryVersions.createdAt))
      : [];

  const comments =
    entryIds.length > 0
      ? await db
          .select({
            id: workEntryComments.id,
            workEntryId: workEntryComments.workEntryId,
            body: workEntryComments.body,
            authorName: users.name,
            createdAt: workEntryComments.createdAt,
          })
          .from(workEntryComments)
          .innerJoin(users, eq(workEntryComments.authorUserId, users.id))
          .where(inArray(workEntryComments.workEntryId, entryIds))
          .orderBy(desc(workEntryComments.createdAt))
      : [];

  return {
    entries: entries.map((entry) => ({
      ...entry,
      versions: versions.filter((version) => version.workEntryId === entry.id),
      comments: comments.filter((comment) => comment.workEntryId === entry.id),
    })),
  };
}

export async function getEmployeeWorkEntryPageData(userId: string) {
  const current = await getOrFindCurrentSubmission(userId);
  const releases = await getAvailableReleases();
  const allDepartments = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
    })
    .from(departments)
    .orderBy(departments.name);

  if (!current) {
    return {
      assignment: null,
      submission: null,
      entries: [],
      releases,
      departments: allDepartments,
    };
  }

  const submissionEntries = current.submission
    ? await getSubmissionEntries(current.submission.id)
    : { entries: [] };

  return {
    assignment: current.assignment,
    submission: current.submission,
    entries: submissionEntries.entries,
    releases,
    departments: allDepartments,
  };
}

export async function getLeadWorkEntryPageData() {
  const today = getDateStringForTimeZone(new Date(), "America/Denver");
  const allDepartments = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
    })
    .from(departments)
    .orderBy(departments.name);

  const submissions = await db
    .select({
      submissionId: shiftSubmissions.id,
      status: shiftSubmissions.status,
      businessDate: shiftSubmissions.businessDate,
      submittedAt: shiftSubmissions.submittedAt,
      reopenCount: shiftSubmissions.reopenCount,
      employeeName: employees.displayName,
      shiftName: shifts.name,
      stationCode: stations.code,
      stationName: stations.name,
      departmentName: departments.name,
      entryCount: sql<number>`count(${workEntries.id})`,
      panelEquivalentTotal: sql<string>`coalesce(sum(${workEntries.panelEquivalentQuantity}), 0)`,
      unverifiedCount:
        sql<number>`sum(case when ${workEntries.verificationStatus} <> 'VERIFIED' then 1 else 0 end)`,
    })
    .from(shiftSubmissions)
    .innerJoin(employees, eq(shiftSubmissions.employeeId, employees.id))
    .innerJoin(shifts, eq(shiftSubmissions.shiftId, shifts.id))
    .innerJoin(stations, eq(shiftSubmissions.stationId, stations.id))
    .innerJoin(departments, eq(shiftSubmissions.departmentId, departments.id))
    .leftJoin(workEntries, eq(workEntries.submissionId, shiftSubmissions.id))
    .where(eq(shiftSubmissions.businessDate, today))
    .groupBy(
      shiftSubmissions.id,
      shiftSubmissions.status,
      shiftSubmissions.businessDate,
      shiftSubmissions.submittedAt,
      shiftSubmissions.reopenCount,
      employees.displayName,
      shifts.name,
      stations.code,
      stations.name,
      departments.name,
    )
    .orderBy(departments.name, employees.displayName);

  const departmentTotals = await db
    .select({
      departmentName: departments.name,
      nativeUnitType: departments.nativeUnitLabel,
      nativeQuantityTotal:
        sql<string>`coalesce(sum(${workEntries.nativeQuantity}), 0)`,
      panelEquivalentTotal:
        sql<string>`coalesce(sum(${workEntries.panelEquivalentQuantity}), 0)`,
      verifiedCount:
        sql<number>`sum(case when ${workEntries.verificationStatus} = 'VERIFIED' then 1 else 0 end)`,
      entryCount: sql<number>`count(${workEntries.id})`,
    })
    .from(workEntries)
    .innerJoin(departments, eq(workEntries.departmentId, departments.id))
    .where(eq(workEntries.businessDate, today))
    .groupBy(departments.name, departments.nativeUnitLabel)
    .orderBy(departments.name);

  const currentSubmissions = await Promise.all(
    submissions.map(async (submission) => ({
      ...submission,
      ...(await getSubmissionEntries(submission.submissionId)),
    })),
  );

  return {
    businessDate: today,
    submissions: currentSubmissions,
    departmentTotals,
    departments: allDepartments,
  };
}

export type EmployeeWorkEntryPageData = Awaited<
  ReturnType<typeof getEmployeeWorkEntryPageData>
>;

export type LeadWorkEntryPageData = Awaited<
  ReturnType<typeof getLeadWorkEntryPageData>
>;
