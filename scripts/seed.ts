import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  auditLogs,
  departments,
  employeeStationAssignments,
  employees,
  jobDocuments,
  jobReleases,
  jobs,
  roles,
  shiftSubmissions,
  shifts,
  stations,
  users,
  workEntries,
  workEntryComments,
  workEntryVersions,
} from "@/lib/db/schema";

async function main() {
  const now = new Date();

  await db
    .insert(roles)
    .values([
      {
        slug: "platform_admin",
        name: "Platform Admin",
        description: "Owns system configuration, security, and role assignment.",
      },
      {
        slug: "ops_lead",
        name: "Ops Lead",
        description: "Owns shift closure, release readiness, and throughput review.",
      },
      {
        slug: "department_lead",
        name: "Department Lead",
        description: "Verifies departmental entries and supervises workstations.",
      },
      {
        slug: "employee",
        name: "Employee",
        description: "Logs native-unit work against assigned stations and releases.",
      },
    ])
    .onConflictDoNothing();

  const seededUsers = [
    {
      id: "usr_admin_elward",
      name: "Morgan Reyes",
      email: "morgan.reyes@elwardsystems.example",
      emailVerified: true,
      status: "ACTIVE" as const,
      activeRole: "platform_admin",
    },
    {
      id: "usr_ops_lead",
      name: "Avery Chen",
      email: "avery.chen@elwardsystems.example",
      emailVerified: true,
      status: "ACTIVE" as const,
      activeRole: "ops_lead",
    },
    {
      id: "usr_employee",
      name: "Jordan Patel",
      email: "jordan.patel@elwardsystems.example",
      emailVerified: true,
      status: "ACTIVE" as const,
      activeRole: "employee",
    },
    {
      id: "usr_department_lead",
      name: "Taylor Brooks",
      email: "taylor.brooks@elwardsystems.example",
      emailVerified: true,
      status: "ACTIVE" as const,
      activeRole: "department_lead",
    },
    {
      id: "usr_employee_cnc",
      name: "Riley Gomez",
      email: "riley.gomez@elwardsystems.example",
      emailVerified: true,
      status: "ACTIVE" as const,
      activeRole: "employee",
    },
  ];

  for (const user of seededUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoNothing();
  }

  await db
    .insert(departments)
    .values([
      {
        code: "CNC",
        name: "CNC",
        nativeUnitLabel: "sheets",
        panelsPerNativeUnit: "1",
      },
      {
        code: "ELU",
        name: "Elumatics",
        nativeUnitLabel: "bars",
        panelsPerNativeUnit: "0.5",
      },
      {
        code: "PPR",
        name: "Parts Prep",
        nativeUnitLabel: "kits",
        panelsPerNativeUnit: "0.75",
      },
      {
        code: "PNL",
        name: "Panel Prep",
        nativeUnitLabel: "panels",
        panelsPerNativeUnit: "1",
      },
      {
        code: "ASM",
        name: "Assembly",
        nativeUnitLabel: "assemblies",
        panelsPerNativeUnit: "1",
      },
      {
        code: "SHP",
        name: "Shipping",
        nativeUnitLabel: "shipments",
        panelsPerNativeUnit: "8",
      },
    ])
    .onConflictDoNothing();

  const cnc = await db.query.departments.findFirst({
    where: eq(departments.code, "CNC"),
  });
  const panelPrep = await db.query.departments.findFirst({
    where: eq(departments.code, "PNL"),
  });
  const assembly = await db.query.departments.findFirst({
    where: eq(departments.code, "ASM"),
  });

  if (!cnc || !panelPrep || !assembly) {
    throw new Error("Seed departments were not created.");
  }

  await db
    .insert(stations)
    .values([
      {
        departmentId: cnc.id,
        code: "CNC-01",
        name: "CNC Cell 01",
      },
      {
        departmentId: panelPrep.id,
        code: "PNL-01",
        name: "Panel Prep Bench 01",
      },
      {
        departmentId: assembly.id,
        code: "ASM-LEAD",
        name: "Assembly Lead Station",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(shifts)
    .values([
      {
        code: "DAY",
        name: "Day Shift",
        timezone: "America/Denver",
        startLocal: "06:00:00",
        endLocal: "14:30:00",
      },
      {
        code: "SWING",
        name: "Swing Shift",
        timezone: "America/Denver",
        startLocal: "14:30:00",
        endLocal: "23:00:00",
      },
    ])
    .onConflictDoNothing();

  const dayShift = await db.query.shifts.findFirst({
    where: eq(shifts.code, "DAY"),
  });
  const panelPrepStation = await db.query.stations.findFirst({
    where: eq(stations.code, "PNL-01"),
  });
  const cncStation = await db.query.stations.findFirst({
    where: eq(stations.code, "CNC-01"),
  });
  const assemblyLeadStation = await db.query.stations.findFirst({
    where: eq(stations.code, "ASM-LEAD"),
  });

  if (!dayShift || !panelPrepStation || !cncStation || !assemblyLeadStation) {
    throw new Error("Seed shift or station was not created.");
  }

  const employeeProfiles = [
    {
      userId: "usr_ops_lead",
      employeeCode: "ELW-2001",
      displayName: "Avery Chen",
      givenName: "Avery",
      familyName: "Chen",
      timezone: "America/Denver",
      defaultDepartmentId: assembly.id,
    },
    {
      userId: "usr_employee",
      employeeCode: "ELW-3025",
      displayName: "Jordan Patel",
      givenName: "Jordan",
      familyName: "Patel",
      timezone: "America/Denver",
      defaultDepartmentId: panelPrep.id,
    },
    {
      userId: "usr_department_lead",
      employeeCode: "ELW-1985",
      displayName: "Taylor Brooks",
      givenName: "Taylor",
      familyName: "Brooks",
      timezone: "America/Denver",
      defaultDepartmentId: panelPrep.id,
    },
    {
      userId: "usr_employee_cnc",
      employeeCode: "ELW-4110",
      displayName: "Riley Gomez",
      givenName: "Riley",
      familyName: "Gomez",
      timezone: "America/Denver",
      defaultDepartmentId: cnc.id,
    },
  ];

  for (const employee of employeeProfiles) {
    await db
      .insert(employees)
      .values(employee)
      .onConflictDoNothing();
  }

  const jordan = await db.query.employees.findFirst({
    where: eq(employees.userId, "usr_employee"),
  });
  const riley = await db.query.employees.findFirst({
    where: eq(employees.userId, "usr_employee_cnc"),
  });
  const avery = await db.query.employees.findFirst({
    where: eq(employees.userId, "usr_ops_lead"),
  });

  if (!jordan || !riley || !avery) {
    throw new Error("Seed employees were not created.");
  }

  await db
    .insert(employeeStationAssignments)
    .values([
      {
        employeeId: jordan.id,
        stationId: panelPrepStation.id,
        shiftId: dayShift.id,
        isPrimary: true,
        startsAt: now,
      },
      {
        employeeId: riley.id,
        stationId: cncStation.id,
        shiftId: dayShift.id,
        isPrimary: true,
        startsAt: now,
      },
      {
        employeeId: avery.id,
        stationId: assemblyLeadStation.id,
        shiftId: dayShift.id,
        isPrimary: true,
        startsAt: now,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(jobs)
    .values({
      jobNumber: "J-240315",
      customerName: "North Ridge Utilities",
      productName: "Outdoor Disconnect Panels",
      status: "ACTIVE",
      createdByUserId: "usr_admin_elward",
    })
    .onConflictDoNothing();

  const seededJob = await db.query.jobs.findFirst({
    where: eq(jobs.jobNumber, "J-240315"),
  });

  if (!seededJob) {
    throw new Error("Seed job was not created.");
  }

  await db
    .insert(jobReleases)
    .values({
      jobId: seededJob.id,
      releaseCode: "R1",
      revisionCode: "A",
      status: "READY",
      panelBaseline: "640.00",
      baselineApprovedAt: now,
      baselineApprovedByUserId: "usr_ops_lead",
      plannedShipDate: "2026-04-03",
      dueDate: "2026-04-01",
      notes: "Initial seeded release for platform foundation.",
    })
    .onConflictDoNothing();

  const seededRelease = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.releaseCode, "R1"),
  });

  if (!seededRelease) {
    throw new Error("Seed release was not created.");
  }

  await db
    .insert(jobDocuments)
    .values({
      jobReleaseId: seededRelease.id,
      kind: "BASELINE_PDF",
      fileName: "J-240315-R1-baseline.pdf",
      contentType: "application/pdf",
      byteSize: 204800,
      checksumSha256:
        "2d46d6b8d73f4cf142b71f22bcaa4fbfef4d4f1bdd1bcd0ab6f79edcc8dcf12a",
      storageProvider: "local",
      storageKey: "seed/J-240315-R1-baseline.pdf",
      extractionStatus: "REVIEWED",
      extractionPayload: {
        releaseCode: "R1",
        revisionCode: "A",
        panelBaseline: 640,
        notes: ["Seeded example extraction payload."],
        confidence: 0.87,
      },
      uploadedByUserId: "usr_ops_lead",
    })
    .onConflictDoNothing();

  await db
    .insert(shiftSubmissions)
    .values([
      {
        employeeId: jordan.id,
        stationId: panelPrepStation.id,
        departmentId: panelPrep.id,
        shiftId: dayShift.id,
        businessDate: "2026-03-29",
        status: "OPEN",
      },
      {
        employeeId: riley.id,
        stationId: cncStation.id,
        departmentId: cnc.id,
        shiftId: dayShift.id,
        businessDate: "2026-03-29",
        status: "SUBMITTED",
        submittedAt: now,
        submittedByUserId: "usr_ops_lead",
      },
    ])
    .onConflictDoNothing();

  const jordanSubmission = await db.query.shiftSubmissions.findFirst({
    where: eq(shiftSubmissions.employeeId, jordan.id),
  });
  const rileySubmission = await db.query.shiftSubmissions.findFirst({
    where: eq(shiftSubmissions.employeeId, riley.id),
  });

  if (!jordanSubmission || !rileySubmission) {
    throw new Error("Seed shift submissions were not created.");
  }

  await db
    .insert(workEntries)
    .values([
      {
        submissionId: jordanSubmission.id,
        jobReleaseId: seededRelease.id,
        stationId: panelPrepStation.id,
        departmentId: panelPrep.id,
        nativeUnitType: panelPrep.nativeUnitLabel,
        nativeQuantity: "42.00",
        panelEquivalentQuantity: "42.00",
        businessDate: "2026-03-29",
        shiftId: dayShift.id,
        verificationStatus: "VERIFIED",
        versionCount: 2,
        verifiedAt: now,
        verifiedByUserId: "usr_department_lead",
        leadCommentCount: 1,
        createdByUserId: "usr_employee",
      },
      {
        submissionId: jordanSubmission.id,
        jobReleaseId: seededRelease.id,
        stationId: panelPrepStation.id,
        departmentId: panelPrep.id,
        nativeUnitType: panelPrep.nativeUnitLabel,
        nativeQuantity: "6.00",
        panelEquivalentQuantity: "6.00",
        businessDate: "2026-03-29",
        shiftId: dayShift.id,
        verificationStatus: "UNVERIFIED",
        versionCount: 1,
        isRework: true,
        faultDepartmentId: cnc.id,
        fixingDepartmentId: panelPrep.id,
        reworkNotes: "Damaged corners corrected during panel prep.",
        createdByUserId: "usr_employee",
      },
      {
        submissionId: rileySubmission.id,
        jobReleaseId: seededRelease.id,
        stationId: cncStation.id,
        departmentId: cnc.id,
        nativeUnitType: cnc.nativeUnitLabel,
        nativeQuantity: "18.00",
        panelEquivalentQuantity: "18.00",
        businessDate: "2026-03-29",
        shiftId: dayShift.id,
        verificationStatus: "VERIFIED",
        isLocked: true,
        versionCount: 3,
        editedAt: now,
        editedByUserId: "usr_ops_lead",
        editReason: "Adjusted quantity after scrap count review.",
        verifiedAt: now,
        verifiedByUserId: "usr_ops_lead",
        createdByUserId: "usr_employee_cnc",
      },
    ])
    .onConflictDoNothing();

  const jordanVerifiedEntry = await db.query.workEntries.findFirst({
    where: and(
      eq(workEntries.submissionId, jordanSubmission.id),
      eq(workEntries.nativeQuantity, "42.00"),
    ),
  });
  const jordanReworkEntry = await db.query.workEntries.findFirst({
    where: and(
      eq(workEntries.submissionId, jordanSubmission.id),
      eq(workEntries.nativeQuantity, "6.00"),
    ),
  });
  const rileyLockedEntry = await db.query.workEntries.findFirst({
    where: eq(workEntries.submissionId, rileySubmission.id),
  });

  if (!jordanVerifiedEntry || !jordanReworkEntry || !rileyLockedEntry) {
    throw new Error("Seed work entries were not created.");
  }

  await db
    .insert(workEntryVersions)
    .values([
      {
        workEntryId: jordanVerifiedEntry.id,
        versionNumber: 1,
        changeType: "CREATED",
        changedByUserId: "usr_employee",
        note: "Initial panel prep entry.",
        snapshot: {
          nativeQuantity: "42.00",
          panelEquivalentQuantity: "42.00",
          verificationStatus: "UNVERIFIED",
        },
      },
      {
        workEntryId: jordanVerifiedEntry.id,
        versionNumber: 2,
        changeType: "VERIFIED",
        changedByUserId: "usr_department_lead",
        note: "Verified after in-shift review.",
        snapshot: {
          nativeQuantity: "42.00",
          panelEquivalentQuantity: "42.00",
          verificationStatus: "VERIFIED",
        },
      },
      {
        workEntryId: jordanReworkEntry.id,
        versionNumber: 1,
        changeType: "CREATED",
        changedByUserId: "usr_employee",
        note: "Rework logged against panel prep.",
        snapshot: {
          nativeQuantity: "6.00",
          isRework: true,
          faultDepartment: "CNC",
          fixingDepartment: "Panel Prep",
        },
      },
      {
        workEntryId: rileyLockedEntry.id,
        versionNumber: 1,
        changeType: "CREATED",
        changedByUserId: "usr_employee_cnc",
        note: "Initial CNC routing entry.",
        snapshot: {
          nativeQuantity: "20.00",
          panelEquivalentQuantity: "20.00",
        },
      },
      {
        workEntryId: rileyLockedEntry.id,
        versionNumber: 2,
        changeType: "EDITED",
        changedByUserId: "usr_ops_lead",
        note: "Adjusted quantity after scrap count review.",
        snapshot: {
          nativeQuantity: "18.00",
          panelEquivalentQuantity: "18.00",
          editReason: "Adjusted quantity after scrap count review.",
        },
      },
      {
        workEntryId: rileyLockedEntry.id,
        versionNumber: 3,
        changeType: "SUBMITTED",
        changedByUserId: "usr_ops_lead",
        note: "Submit-all locked this entry.",
        snapshot: {
          isLocked: true,
          verificationStatus: "VERIFIED",
        },
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(workEntryComments)
    .values({
      workEntryId: jordanVerifiedEntry.id,
      authorUserId: "usr_department_lead",
      body: "Verified against the release traveler and station output.",
    })
    .onConflictDoNothing();

  await db.insert(auditLogs).values({
    actorUserId: "usr_admin_elward",
    action: "seed.completed",
    entityType: "system",
    entityId: "foundation",
    metadata: {
      users: seededUsers.length,
      departments: 6,
      version: 2,
    },
  });

  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
