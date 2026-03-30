import { eq } from "drizzle-orm";

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
  shifts,
  stations,
  users,
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
        code: "LAM",
        name: "Lamination",
        nativeUnitLabel: "stacks",
        panelsPerNativeUnit: "4",
      },
      {
        code: "CNC",
        name: "CNC Routing",
        nativeUnitLabel: "sheets",
        panelsPerNativeUnit: "1",
      },
      {
        code: "ASM",
        name: "Final Assembly",
        nativeUnitLabel: "assemblies",
        panelsPerNativeUnit: "1",
      },
    ])
    .onConflictDoNothing();

  const lamination = await db.query.departments.findFirst({
    where: eq(departments.code, "LAM"),
  });
  const cnc = await db.query.departments.findFirst({
    where: eq(departments.code, "CNC"),
  });

  if (!lamination || !cnc) {
    throw new Error("Seed departments were not created.");
  }

  await db
    .insert(stations)
    .values([
      {
        departmentId: lamination.id,
        code: "LAM-01",
        name: "Lamination Cell 01",
      },
      {
        departmentId: cnc.id,
        code: "CNC-01",
        name: "Router Table 01",
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
  const laminationStation = await db.query.stations.findFirst({
    where: eq(stations.code, "LAM-01"),
  });

  if (!dayShift || !laminationStation) {
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
      defaultDepartmentId: lamination.id,
    },
    {
      userId: "usr_employee",
      employeeCode: "ELW-3025",
      displayName: "Jordan Patel",
      givenName: "Jordan",
      familyName: "Patel",
      timezone: "America/Denver",
      defaultDepartmentId: lamination.id,
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

  if (!jordan) {
    throw new Error("Seed employee was not created.");
  }

  await db
    .insert(employeeStationAssignments)
    .values({
      employeeId: jordan.id,
      stationId: laminationStation.id,
      shiftId: dayShift.id,
      isPrimary: true,
      startsAt: now,
    })
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

  await db.insert(auditLogs).values({
    actorUserId: "usr_admin_elward",
    action: "seed.completed",
    entityType: "system",
    entityId: "foundation",
    metadata: {
      users: seededUsers.length,
      departments: 3,
      version: 1,
    },
  });

  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
