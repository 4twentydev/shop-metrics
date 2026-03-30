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
  metricTargets,
  reportExportDeliveries,
  reportTemplates,
  releaseComments,
  releaseExtractionRuns,
  releaseIntakeBatches,
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
    .values([
      {
        jobNumber: "24031",
        customerName: "North Ridge Utilities",
        productName: "Outdoor Disconnect Panels",
        status: "ACTIVE",
        createdByUserId: "usr_admin_elward",
      },
      {
        jobNumber: "24032",
        customerName: "Cedar Valley Power",
        productName: "Metering Retrofit Panels",
        status: "ACTIVE",
        createdByUserId: "usr_admin_elward",
      },
      {
        jobNumber: "24033",
        customerName: "Mesa Water",
        productName: "Accessory Enclosures",
        status: "PLANNED",
        createdByUserId: "usr_admin_elward",
      },
    ])
    .onConflictDoNothing();

  const seededJob = await db.query.jobs.findFirst({
    where: eq(jobs.jobNumber, "24031"),
  });
  const secondaryJob = await db.query.jobs.findFirst({
    where: eq(jobs.jobNumber, "24032"),
  });
  const tertiaryJob = await db.query.jobs.findFirst({
    where: eq(jobs.jobNumber, "24033"),
  });

  if (!seededJob || !secondaryJob || !tertiaryJob) {
    throw new Error("Seed jobs were not created.");
  }

  await db
    .insert(jobReleases)
    .values([
      {
        jobId: seededJob.id,
        releaseCode: "R1",
        revisionCode: "A",
        status: "READY",
        partFamily: "DISCONNECT",
        panelBaseline: "640.00",
        baselineApprovedAt: now,
        baselineApprovedByUserId: "usr_ops_lead",
        plannedShipDate: "2026-04-03",
        dueDate: "2026-04-01",
        notes: "Initial seeded release for platform foundation.",
      },
      {
        jobId: secondaryJob.id,
        releaseCode: "RMK1",
        revisionCode: "B",
        status: "READY",
        partFamily: "METERING",
        panelBaseline: "180.00",
        baselineApprovedAt: now,
        baselineApprovedByUserId: "usr_ops_lead",
        plannedShipDate: "2026-04-10",
        dueDate: "2026-04-08",
        notes: "Remark release for intake review demo.",
      },
      {
        jobId: secondaryJob.id,
        releaseCode: "RME1",
        revisionCode: "A",
        status: "PENDING_BASELINE",
        partFamily: "METERING",
        plannedShipDate: "2026-04-12",
        dueDate: "2026-04-10",
        notes: "Engineering revision release awaiting baseline.",
      },
      {
        jobId: tertiaryJob.id,
        releaseCode: "A1",
        revisionCode: "A",
        status: "PENDING_BASELINE",
        partFamily: "ACCESSORY",
        plannedShipDate: "2026-04-20",
        dueDate: "2026-04-18",
        notes: "Accessory release type demo.",
      },
    ])
    .onConflictDoNothing();

  const seededRelease = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.releaseCode, "R1"),
  });
  const intakeDemoRelease = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.releaseCode, "RMK1"),
  });
  const engineeringRelease = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.releaseCode, "RME1"),
  });

  if (!seededRelease || !intakeDemoRelease || !engineeringRelease) {
    throw new Error("Seed releases were not created.");
  }

  await db
    .insert(jobDocuments)
    .values({
      jobReleaseId: seededRelease.id,
      documentFamily: "BASELINE_PACKET",
      kind: "BASELINE_PDF",
      revisionNumber: 1,
      supersedeDecision: "KEEP_REFERENCE",
      fileName: "24031-R1-baseline.pdf",
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
      affectsBaseline: true,
      uploaderNotes: "Approved baseline packet.",
    })
    .onConflictDoNothing();

  const intakeBatch = await db
    .insert(releaseIntakeBatches)
    .values({
      jobReleaseId: intakeDemoRelease.id,
      uploadLabel: "RMK1 revised packet",
      notes: "Customer revision package uploaded for review.",
      status: "PENDING_REVIEW",
      affectsApprovedBaseline: true,
      uploadedByUserId: "usr_ops_lead",
    })
    .onConflictDoNothing()
    .returning({ id: releaseIntakeBatches.id });

  const intakeBatchId =
    intakeBatch[0]?.id ??
    (
      await db.query.releaseIntakeBatches.findFirst({
        where: eq(releaseIntakeBatches.jobReleaseId, intakeDemoRelease.id),
      })
    )?.id;

  if (!intakeBatchId) {
    throw new Error("Seed intake batch was not created.");
  }

  await db
    .update(jobReleases)
    .set({
      baselineStaleAt: now,
      baselineStaleReason:
        "A revised intake batch uploaded baseline-affecting documents after approval.",
      baselineStaleSourceBatchId: intakeBatchId,
      updatedAt: now,
    })
    .where(eq(jobReleases.id, intakeDemoRelease.id));

  await db
    .insert(jobDocuments)
    .values([
      {
        jobReleaseId: intakeDemoRelease.id,
        documentFamily: "REVISION_PACKET",
        kind: "REVISION_PDF",
        revisionNumber: 1,
        supersedeDecision: "KEEP_REFERENCE",
        fileName: "24032-RMK1-revision-packet-v1.pdf",
        contentType: "application/pdf",
        byteSize: 190000,
        checksumSha256:
          "ab46d6b8d73f4cf142b71f22bcaa4fbfef4d4f1bdd1bcd0ab6f79edcc8dcf121",
        storageProvider: "local",
        storageKey: "seed/24032-RMK1-revision-packet-v1.pdf",
        extractionStatus: "PENDING",
        uploadedByUserId: "usr_ops_lead",
        affectsBaseline: true,
        uploaderNotes: "Original current revision packet.",
        isCurrent: true,
      },
      {
        jobReleaseId: intakeDemoRelease.id,
        intakeBatchId,
        documentFamily: "REVISION_PACKET",
        kind: "REVISION_PDF",
        revisionNumber: 2,
        supersedeDecision: "PENDING",
        fileName: "24032-RMK1-revision-packet-v2.pdf",
        contentType: "application/pdf",
        byteSize: 198000,
        checksumSha256:
          "bb46d6b8d73f4cf142b71f22bcaa4fbfef4d4f1bdd1bcd0ab6f79edcc8dcf122",
        storageProvider: "local",
        storageKey: "seed/24032-RMK1-revision-packet-v2.pdf",
        extractionStatus: "PENDING",
        uploadedByUserId: "usr_ops_lead",
        affectsBaseline: true,
        uploaderNotes: "Supersede decision pending lead review.",
        isCurrent: false,
      },
      {
        jobReleaseId: intakeDemoRelease.id,
        intakeBatchId,
        documentFamily: "QUALITY_CERT",
        kind: "QUALITY_PDF",
        revisionNumber: 1,
        supersedeDecision: "PENDING",
        fileName: "24032-RMK1-quality-cert.pdf",
        contentType: "application/pdf",
        byteSize: 102400,
        checksumSha256:
          "cb46d6b8d73f4cf142b71f22bcaa4fbfef4d4f1bdd1bcd0ab6f79edcc8dcf123",
        storageProvider: "local",
        storageKey: "seed/24032-RMK1-quality-cert.pdf",
        extractionStatus: "PENDING",
        uploadedByUserId: "usr_ops_lead",
        affectsBaseline: false,
        uploaderNotes: "Ancillary quality document for extraction handoff.",
        isCurrent: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(releaseComments)
    .values([
      {
        jobReleaseId: intakeDemoRelease.id,
        intakeBatchId,
        authorUserId: "usr_department_lead",
        body: "Review revised packet against the approved baseline before releasing to extraction.",
      },
      {
        jobReleaseId: intakeDemoRelease.id,
        authorUserId: "usr_ops_lead",
        body: "Customer asked us to preserve prior revision until supersede is approved.",
      },
    ])
    .onConflictDoNothing();

  const baselineDoc = await db.query.jobDocuments.findFirst({
    where: and(
      eq(jobDocuments.jobReleaseId, seededRelease.id),
      eq(jobDocuments.documentFamily, "BASELINE_PACKET"),
    ),
  });
  const demoDocs = await db.query.jobDocuments.findMany({
    where: eq(jobDocuments.jobReleaseId, intakeDemoRelease.id),
  });

  if (!baselineDoc || demoDocs.length === 0) {
    throw new Error("Seed extraction documents were not created.");
  }

  const approvedRun = await db
    .insert(releaseExtractionRuns)
    .values({
      jobReleaseId: seededRelease.id,
      provider: "gemini",
      model: "gemini-2.5-pro",
      status: "SUCCEEDED",
      reviewStatus: "APPROVED",
      attemptNumber: 1,
      sourceDocumentIds: [baselineDoc.id],
      rawOutput: {
        candidates: 1,
      },
      normalizedOutput: {
        releaseCode: "R1",
        revisionCode: "A",
        customerName: "North Ridge Utilities",
        productName: "Outdoor Disconnect Panels",
        summary: {
          expectedPanels: 640,
          releaseTotals:
            "Release total confirms 640 panels in the baseline packet.",
          materialTotals:
            "Steel enclosure material and bus components match baseline pack.",
          partTotals: "Primary part totals align with 640-panel build.",
          accessoryTotals:
            "Accessory pack includes standard hardware and labels.",
          dueDates: ["2026-04-01"],
          revisionNotes: ["Baseline packet approved without open revisions."],
          additionalSummaryFields: [
            {
              label: "Primary enclosure type",
              value: "Outdoor disconnect enclosure",
            },
          ],
          confidence: 0.96,
        },
      },
      reviewedOutput: {
        releaseCode: "R1",
        revisionCode: "A",
        customerName: "North Ridge Utilities",
        productName: "Outdoor Disconnect Panels",
        summary: {
          expectedPanels: 640,
          releaseTotals:
            "Release total confirms 640 panels in the baseline packet.",
          materialTotals:
            "Steel enclosure material and bus components match baseline pack.",
          partTotals: "Primary part totals align with 640-panel build.",
          accessoryTotals:
            "Accessory pack includes standard hardware and labels.",
          dueDates: ["2026-04-01"],
          revisionNotes: ["Baseline packet approved without open revisions."],
          additionalSummaryFields: [
            {
              label: "Primary enclosure type",
              value: "Outdoor disconnect enclosure",
            },
          ],
          confidence: 0.96,
        },
      },
      confidence: "0.9600",
      reviewerNotes: "Reviewed and approved as release baseline.",
      createdByUserId: "usr_ops_lead",
      reviewedByUserId: "usr_ops_lead",
      completedAt: now,
      reviewedAt: now,
      approvedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: releaseExtractionRuns.id });

  await db
    .insert(releaseExtractionRuns)
    .values({
      jobReleaseId: intakeDemoRelease.id,
      intakeBatchId,
      provider: "gemini",
      model: "gemini-2.5-pro",
      status: "SUCCEEDED",
      reviewStatus: "PENDING_REVIEW",
      attemptNumber: 1,
      sourceDocumentIds: demoDocs.map((doc) => doc.id),
      rawOutput: {
        candidates: 1,
      },
      normalizedOutput: {
        releaseCode: "RMK1",
        revisionCode: "B",
        customerName: "Cedar Valley Power",
        productName: "Metering Retrofit Panels",
        summary: {
          expectedPanels: 188,
          releaseTotals:
            "Revised release totals indicate 188 panel-equivalent units.",
          materialTotals:
            "Copper bar, metering cans, and steel backpan counts revised upward.",
          partTotals:
            "Primary mechanical parts updated for revised meter arrangement.",
          accessoryTotals:
            "Accessory total includes labels, terminals, and gasket kits.",
          dueDates: ["2026-04-08", "2026-04-10"],
          revisionNotes: [
            "Revision packet supersede still pending review.",
            "Quality cert attached.",
          ],
          additionalSummaryFields: [
            {
              label: "Meter can configuration",
              value: "Revised to dual grouping arrangement",
            },
          ],
          confidence: 0.82,
        },
      },
      reviewedOutput: {
        releaseCode: "RMK1",
        revisionCode: "B",
        customerName: "Cedar Valley Power",
        productName: "Metering Retrofit Panels",
        summary: {
          expectedPanels: 188,
          releaseTotals:
            "Revised release totals indicate 188 panel-equivalent units.",
          materialTotals:
            "Copper bar, metering cans, and steel backpan counts revised upward.",
          partTotals:
            "Primary mechanical parts updated for revised meter arrangement.",
          accessoryTotals:
            "Accessory total includes labels, terminals, and gasket kits.",
          dueDates: ["2026-04-08", "2026-04-10"],
          revisionNotes: [
            "Revision packet supersede still pending review.",
            "Quality cert attached.",
          ],
          additionalSummaryFields: [
            {
              label: "Meter can configuration",
              value: "Revised to dual grouping arrangement",
            },
          ],
          confidence: 0.82,
        },
      },
      confidence: "0.8200",
      reviewerNotes: "Requires human adjustment before baseline re-approval.",
      createdByUserId: "usr_ops_lead",
      completedAt: now,
      reviewedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(releaseExtractionRuns)
    .values({
      jobReleaseId: engineeringRelease.id,
      provider: "gemini",
      model: "gemini-2.5-pro",
      status: "FAILED",
      reviewStatus: "PENDING_REVIEW",
      attemptNumber: 1,
      sourceDocumentIds: [],
      errorMessage:
        "Gemini could not extract a stable summary because the release document set is incomplete.",
      createdByUserId: "usr_ops_lead",
      completedAt: now,
    })
    .onConflictDoNothing();

  const approvedRunId =
    approvedRun[0]?.id ??
    (
      await db.query.releaseExtractionRuns.findFirst({
        where: eq(releaseExtractionRuns.jobReleaseId, seededRelease.id),
      })
    )?.id;

  if (!approvedRunId) {
    throw new Error("Approved extraction run was not created.");
  }

  await db
    .update(jobReleases)
    .set({
      baselineApprovedExtractionRunId: approvedRunId,
      updatedAt: now,
    })
    .where(eq(jobReleases.id, seededRelease.id));

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
        reworkSource: "INTERNAL_FAULT",
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
      {
        submissionId: jordanSubmission.id,
        jobReleaseId: seededRelease.id,
        stationId: panelPrepStation.id,
        departmentId: panelPrep.id,
        nativeUnitType: panelPrep.nativeUnitLabel,
        nativeQuantity: "2.00",
        panelEquivalentQuantity: "2.00",
        businessDate: "2026-03-29",
        shiftId: dayShift.id,
        verificationStatus: "VERIFIED",
        isRework: true,
        reworkSource: "INSTALLER_FAULT",
        faultDepartmentId: assembly.id,
        fixingDepartmentId: panelPrep.id,
        reworkNotes: "Field damage remake returned from installer site.",
        verifiedAt: now,
        verifiedByUserId: "usr_department_lead",
        createdByUserId: "usr_employee",
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

  await db
    .insert(metricTargets)
    .values([
      {
        windowType: "DAILY",
        scopeType: "COMPANY",
        scopeKey: "ELWARD_SYSTEMS",
        metricKey: "panel_output",
        targetValue: "96.00",
        unitLabel: "panels",
        effectiveStart: "2026-03-01",
        enteredByUserId: "usr_admin_elward",
        notes: "Daily company output target.",
      },
      {
        windowType: "DAILY",
        scopeType: "DEPARTMENT",
        scopeReferenceId: panelPrep.id,
        scopeKey: panelPrep.code,
        metricKey: "panel_output",
        targetValue: "48.00",
        unitLabel: "panels",
        effectiveStart: "2026-03-01",
        enteredByUserId: "usr_ops_lead",
        notes: "Panel Prep daily output target.",
      },
      {
        windowType: "WEEKLY",
        scopeType: "RELEASE",
        scopeReferenceId: seededRelease.id,
        scopeKey: seededRelease.releaseCode,
        metricKey: "completion_percentage",
        targetValue: "100.00",
        unitLabel: "percent",
        effectiveStart: "2026-03-23",
        enteredByUserId: "usr_ops_lead",
        notes: "Release should be fully complete by the end of the week.",
      },
      {
        windowType: "MONTHLY",
        scopeType: "PART_FAMILY",
        scopeKey: "DISCONNECT",
        metricKey: "panel_output",
        targetValue: "640.00",
        unitLabel: "panels",
        effectiveStart: "2026-03-01",
        enteredByUserId: "usr_admin_elward",
        notes: "Monthly disconnect-family throughput target.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reportTemplates)
    .values([
      {
        name: "Executive Daily Overview",
        slug: "executive-daily-overview",
        description:
          "Pinned executive template for daily company output and gap review.",
        viewType: "EXECUTIVE",
        defaultWindowType: "DAILY",
        scopeType: "COMPANY",
        scopeKey: "ELWARD_SYSTEMS",
        sectionConfig: {
          includeSummary: true,
          includeRaw: true,
          includePivot: true,
          highlightAccountability: true,
          highlightBottlenecks: true,
          mobileCondensed: true,
        },
        isPinned: true,
        createdByUserId: "usr_admin_elward",
        updatedByUserId: "usr_admin_elward",
      },
      {
        name: "Daily Rework Review",
        slug: "daily-rework-review",
        description: "Pinned template for remake attribution and fixing-zone review.",
        viewType: "REWORK",
        defaultWindowType: "DAILY",
        scopeType: "COMPANY",
        scopeKey: "ELWARD_SYSTEMS",
        sectionConfig: {
          includeSummary: true,
          includeRaw: true,
          includePivot: true,
          highlightAccountability: false,
          highlightBottlenecks: false,
          mobileCondensed: true,
        },
        isPinned: true,
        createdByUserId: "usr_ops_lead",
        updatedByUserId: "usr_ops_lead",
      },
      {
        name: "Panel Prep Weekly",
        slug: "panel-prep-weekly",
        description: "Weekly department template for panel prep leadership review.",
        viewType: "DEPARTMENT",
        defaultWindowType: "WEEKLY",
        scopeType: "DEPARTMENT",
        scopeReferenceId: panelPrep.id,
        scopeKey: panelPrep.code,
        sectionConfig: {
          includeSummary: true,
          includeRaw: true,
          includePivot: false,
          highlightAccountability: true,
          highlightBottlenecks: false,
          mobileCondensed: true,
        },
        isPinned: false,
        createdByUserId: "usr_department_lead",
        updatedByUserId: "usr_department_lead",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reportExportDeliveries)
    .values({
      reportView: "EXECUTIVE",
      windowType: "DAILY",
      windowStart: "2026-03-29",
      windowEnd: "2026-03-29",
      scopeType: "COMPANY",
      scopeKey: "ELWARD_SYSTEMS",
      packageType: "SINGLE",
      requestedFormats: ["csv"],
      requestedDatasets: ["summary"],
      packageManifest: {
        source: "seed",
        route: "/api/reports/export",
      },
      primaryFileName: "executive-daily-2026-03-29-summary.csv",
      primaryContentType: "text/csv; charset=utf-8",
      byteSize: 512,
      rowCount: 4,
      requestedByUserId: "usr_ops_lead",
      deliveredAt: now,
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
        version: 6,
      },
  });

  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
