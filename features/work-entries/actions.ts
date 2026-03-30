"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { toPanelEquivalent } from "@/features/metrics/formulas";
import {
  commentOnWorkEntrySchema,
  createWorkEntrySchema,
  readBoolean,
  readOptionalString,
  reopenShiftSchema,
  submitShiftSchema,
  updateWorkEntrySchema,
  verifyWorkEntrySchema,
} from "@/features/work-entries/schemas";
import { writeAuditLog } from "@/lib/audit/log";
import { requireOpsRole, requireSession } from "@/lib/auth/permissions";
import { isOpsRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  departments,
  jobReleases,
  shiftSubmissions,
  workEntries,
  workEntryComments,
  workEntryVersions,
} from "@/lib/db/schema";

import { getOrFindCurrentSubmission } from "./queries";

async function createVersionSnapshot(input: {
  workEntryId: string;
  versionNumber: number;
  changeType:
    | "CREATED"
    | "EDITED"
    | "VERIFIED"
    | "COMMENTED"
    | "SUBMITTED"
    | "REOPENED";
  changedByUserId?: string | null;
  note?: string | null;
}) {
  const row = await db.query.workEntries.findFirst({
    where: eq(workEntries.id, input.workEntryId),
  });

  if (!row) {
    throw new Error("Work entry not found for version snapshot.");
  }

  await db.insert(workEntryVersions).values({
    workEntryId: input.workEntryId,
    versionNumber: input.versionNumber,
    changeType: input.changeType,
    changedByUserId: input.changedByUserId ?? null,
    note: input.note ?? null,
    snapshot: row,
  });
}

async function requireEditableEntry(workEntryId: string, actorUserId: string) {
  const entry = await db.query.workEntries.findFirst({
    where: eq(workEntries.id, workEntryId),
  });

  if (!entry) {
    throw new Error("Work entry not found.");
  }

  if (entry.isLocked) {
    throw new Error("Locked entries cannot be re-verified until reopened.");
  }

  const session = await requireSession();
  const isLead = isOpsRole(session.user.activeRole);
  const isOwner = entry.createdByUserId === actorUserId;

  if (!isLead && !isOwner) {
    throw new Error("You are not allowed to edit this entry.");
  }

  if (entry.isLocked) {
    throw new Error("Locked entries must be reopened by a lead before editing.");
  }

  return { entry, isLead, session };
}

export async function createWorkEntryAction(formData: FormData) {
  const session = await requireSession();
  const current = await getOrFindCurrentSubmission(session.user.id);

  if (!current) {
    throw new Error("No active station assignment is available.");
  }

  const parsed = createWorkEntrySchema.parse({
    jobReleaseId: formData.get("jobReleaseId"),
    nativeQuantity: formData.get("nativeQuantity"),
    isRework: readBoolean(formData, "isRework"),
    faultDepartmentId: readOptionalString(formData, "faultDepartmentId"),
    fixingDepartmentId: readOptionalString(formData, "fixingDepartmentId"),
    reworkNotes: readOptionalString(formData, "reworkNotes"),
  });

  const release = await db.query.jobReleases.findFirst({
    where: eq(jobReleases.id, parsed.jobReleaseId),
  });

  if (!release) {
    throw new Error("Selected release was not found.");
  }

  if (!current.submission) {
    const inserted = await db
      .insert(shiftSubmissions)
      .values({
        employeeId: current.assignment.employeeId,
        stationId: current.assignment.stationId,
        departmentId: current.assignment.departmentId,
        shiftId: current.assignment.shiftId,
        businessDate: current.assignment.businessDate,
      })
      .returning({ id: shiftSubmissions.id });

    current.submission = {
      id: inserted[0]!.id,
      employeeId: current.assignment.employeeId,
      stationId: current.assignment.stationId,
      departmentId: current.assignment.departmentId,
      shiftId: current.assignment.shiftId,
      businessDate: current.assignment.businessDate,
      status: "OPEN",
      submittedAt: null,
      submittedByUserId: null,
      reopenedAt: null,
      reopenedByUserId: null,
      reopenReason: null,
      reopenCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } else if (current.submission.status === "SUBMITTED") {
    throw new Error("This shift is locked. A lead must reopen it before changes.");
  }

  const panelEquivalent = toPanelEquivalent(
    parsed.nativeQuantity,
    Number.parseFloat(current.assignment.panelsPerNativeUnit),
  );

  const inserted = await db
    .insert(workEntries)
    .values({
      submissionId: current.submission.id,
      jobReleaseId: parsed.jobReleaseId,
      stationId: current.assignment.stationId,
      departmentId: current.assignment.departmentId,
      nativeUnitType: current.assignment.nativeUnitLabel,
      nativeQuantity: parsed.nativeQuantity.toFixed(2),
      panelEquivalentQuantity: panelEquivalent.toFixed(2),
      businessDate: current.assignment.businessDate,
      shiftId: current.assignment.shiftId,
      isRework: parsed.isRework,
      faultDepartmentId: parsed.faultDepartmentId ?? null,
      fixingDepartmentId: parsed.fixingDepartmentId ?? null,
      reworkNotes: parsed.reworkNotes ?? null,
      createdByUserId: session.user.id,
    })
    .returning({ id: workEntries.id });

  await createVersionSnapshot({
    workEntryId: inserted[0]!.id,
    versionNumber: 1,
    changeType: "CREATED",
    changedByUserId: session.user.id,
    note: parsed.isRework ? "Created as rework." : "Created work entry.",
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "work-entry.created",
    entityType: "work_entry",
    entityId: inserted[0]!.id,
    metadata: {
      submissionId: current.submission.id,
      releaseId: parsed.jobReleaseId,
      nativeQuantity: parsed.nativeQuantity,
      panelEquivalent,
      isRework: parsed.isRework,
    },
  });

  revalidatePath("/employee");
  revalidatePath("/employee/work-entry");
  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
}

export async function updateWorkEntryAction(formData: FormData) {
  const session = await requireSession();
  const parsed = updateWorkEntrySchema.parse({
    workEntryId: formData.get("workEntryId"),
    nativeQuantity: formData.get("nativeQuantity"),
    isRework: readBoolean(formData, "isRework"),
    faultDepartmentId: readOptionalString(formData, "faultDepartmentId"),
    fixingDepartmentId: readOptionalString(formData, "fixingDepartmentId"),
    reworkNotes: readOptionalString(formData, "reworkNotes"),
    editReason: formData.get("editReason"),
  });

  const { entry } = await requireEditableEntry(parsed.workEntryId, session.user.id);
  const department = await db.query.departments.findFirst({
    where: eq(departments.id, entry.departmentId),
  });

  if (!department) {
    throw new Error("Department not found for work entry.");
  }

  const panelEquivalent = toPanelEquivalent(
    parsed.nativeQuantity,
    Number.parseFloat(department.panelsPerNativeUnit),
  );
  const nextVersion = entry.versionCount + 1;

  await db
    .update(workEntries)
    .set({
      nativeQuantity: parsed.nativeQuantity.toFixed(2),
      panelEquivalentQuantity: panelEquivalent.toFixed(2),
      isRework: parsed.isRework,
      faultDepartmentId: parsed.faultDepartmentId ?? null,
      fixingDepartmentId: parsed.fixingDepartmentId ?? null,
      reworkNotes: parsed.reworkNotes ?? null,
      verificationStatus: "UNVERIFIED",
      verifiedAt: null,
      verifiedByUserId: null,
      versionCount: nextVersion,
      editedAt: new Date(),
      editedByUserId: session.user.id,
      editReason: parsed.editReason,
      updatedAt: new Date(),
    })
    .where(eq(workEntries.id, entry.id));

  await createVersionSnapshot({
    workEntryId: entry.id,
    versionNumber: nextVersion,
    changeType: "EDITED",
    changedByUserId: session.user.id,
    note: parsed.editReason,
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "work-entry.edited",
    entityType: "work_entry",
    entityId: entry.id,
    beforeState: entry,
    metadata: {
      nativeQuantity: parsed.nativeQuantity,
      panelEquivalent,
      editReason: parsed.editReason,
    },
  });

  revalidatePath("/employee");
  revalidatePath("/employee/work-entry");
  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
}

export async function verifyWorkEntryAction(formData: FormData) {
  const leadSession = await requireOpsRole();
  const parsed = verifyWorkEntrySchema.parse({
    workEntryId: formData.get("workEntryId"),
    comment: readOptionalString(formData, "comment"),
  });

  const entry = await db.query.workEntries.findFirst({
    where: eq(workEntries.id, parsed.workEntryId),
  });

  if (!entry) {
    throw new Error("Work entry not found.");
  }

  const nextVersion = entry.versionCount + 1;

  await db
    .update(workEntries)
    .set({
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedByUserId: leadSession.user.id,
      versionCount: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(workEntries.id, entry.id));

  await createVersionSnapshot({
    workEntryId: entry.id,
    versionNumber: nextVersion,
    changeType: "VERIFIED",
    changedByUserId: leadSession.user.id,
    note: parsed.comment ?? "Verified by lead.",
  });

  if (parsed.comment) {
    await db.insert(workEntryComments).values({
      workEntryId: entry.id,
      authorUserId: leadSession.user.id,
      body: parsed.comment,
    });
    await db
      .update(workEntries)
      .set({
        leadCommentCount: entry.leadCommentCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(workEntries.id, entry.id));
  }

  await writeAuditLog({
    actorUserId: leadSession.user.id,
    action: "work-entry.verified",
    entityType: "work_entry",
    entityId: entry.id,
    beforeState: entry,
    metadata: {
      comment: parsed.comment ?? null,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
  revalidatePath("/employee");
  revalidatePath("/employee/work-entry");
}

export async function addLeadCommentAction(formData: FormData) {
  const leadSession = await requireOpsRole();
  const parsed = commentOnWorkEntrySchema.parse({
    workEntryId: formData.get("workEntryId"),
    body: formData.get("body"),
  });

  const entry = await db.query.workEntries.findFirst({
    where: eq(workEntries.id, parsed.workEntryId),
  });

  if (!entry) {
    throw new Error("Work entry not found.");
  }

  const nextVersion = entry.versionCount + 1;

  await db.insert(workEntryComments).values({
    workEntryId: entry.id,
    authorUserId: leadSession.user.id,
    body: parsed.body,
  });

  await db
    .update(workEntries)
    .set({
      leadCommentCount: entry.leadCommentCount + 1,
      versionCount: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(workEntries.id, entry.id));

  await createVersionSnapshot({
    workEntryId: entry.id,
    versionNumber: nextVersion,
    changeType: "COMMENTED",
    changedByUserId: leadSession.user.id,
    note: parsed.body,
  });

  await writeAuditLog({
    actorUserId: leadSession.user.id,
    action: "work-entry.commented",
    entityType: "work_entry",
    entityId: entry.id,
    metadata: {
      body: parsed.body,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
}

export async function submitShiftAction(formData: FormData) {
  const leadSession = await requireOpsRole();
  const parsed = submitShiftSchema.parse({
    submissionId: formData.get("submissionId"),
  });

  const submission = await db.query.shiftSubmissions.findFirst({
    where: eq(shiftSubmissions.id, parsed.submissionId),
  });

  if (!submission) {
    throw new Error("Shift submission not found.");
  }

  const unverified = await db.query.workEntries.findMany({
    where: and(
      eq(workEntries.submissionId, submission.id),
      eq(workEntries.verificationStatus, "UNVERIFIED"),
    ),
  });

  if (unverified.length > 0) {
    throw new Error("All entries must be verified before submit-all.");
  }

  await db
    .update(shiftSubmissions)
    .set({
      status: "SUBMITTED",
      submittedAt: new Date(),
      submittedByUserId: leadSession.user.id,
      updatedAt: new Date(),
    })
    .where(eq(shiftSubmissions.id, submission.id));

  const entries = await db.query.workEntries.findMany({
    where: eq(workEntries.submissionId, submission.id),
  });

  for (const entry of entries) {
    const nextVersion = entry.versionCount + 1;

    await db
      .update(workEntries)
      .set({
        isLocked: true,
        versionCount: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(workEntries.id, entry.id));

    await createVersionSnapshot({
      workEntryId: entry.id,
      versionNumber: nextVersion,
      changeType: "SUBMITTED",
      changedByUserId: leadSession.user.id,
      note: "Submit-all locked this entry.",
    });
  }

  await writeAuditLog({
    actorUserId: leadSession.user.id,
    action: "shift-submission.submitted",
    entityType: "shift_submission",
    entityId: submission.id,
    beforeState: submission,
    metadata: {
      entryCount: entries.length,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
  revalidatePath("/employee");
  revalidatePath("/employee/work-entry");
}

export async function reopenShiftAction(formData: FormData) {
  const leadSession = await requireOpsRole();
  const parsed = reopenShiftSchema.parse({
    submissionId: formData.get("submissionId"),
    reason: formData.get("reason"),
  });

  const submission = await db.query.shiftSubmissions.findFirst({
    where: eq(shiftSubmissions.id, parsed.submissionId),
  });

  if (!submission) {
    throw new Error("Shift submission not found.");
  }

  await db
    .update(shiftSubmissions)
    .set({
      status: "OPEN",
      reopenedAt: new Date(),
      reopenedByUserId: leadSession.user.id,
      reopenReason: parsed.reason,
      reopenCount: submission.reopenCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(shiftSubmissions.id, submission.id));

  const entries = await db.query.workEntries.findMany({
    where: eq(workEntries.submissionId, submission.id),
  });

  for (const entry of entries) {
    const nextVersion = entry.versionCount + 1;

    await db
      .update(workEntries)
      .set({
        isLocked: false,
        versionCount: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(workEntries.id, entry.id));

    await createVersionSnapshot({
      workEntryId: entry.id,
      versionNumber: nextVersion,
      changeType: "REOPENED",
      changedByUserId: leadSession.user.id,
      note: parsed.reason,
    });
  }

  await writeAuditLog({
    actorUserId: leadSession.user.id,
    action: "shift-submission.reopened",
    entityType: "shift_submission",
    entityId: submission.id,
    beforeState: submission,
    metadata: {
      reason: parsed.reason,
      reopenCount: submission.reopenCount + 1,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/work-entry");
  revalidatePath("/employee");
  revalidatePath("/employee/work-entry");
}
