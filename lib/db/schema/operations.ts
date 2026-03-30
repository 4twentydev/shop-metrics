import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const employeeStatusEnum = pgEnum("employee_status", [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "PLANNED",
  "ACTIVE",
  "HOLD",
  "COMPLETE",
  "CANCELLED",
]);

export const releaseStatusEnum = pgEnum("release_status", [
  "PENDING_BASELINE",
  "READY",
  "IN_PRODUCTION",
  "SUBMITTED",
  "LOCKED",
  "ARCHIVED",
]);

export const documentKindEnum = pgEnum("document_kind", [
  "BASELINE_PDF",
  "REVISION_PDF",
  "ROUTER_PDF",
  "QUALITY_PDF",
]);

export const extractionStatusEnum = pgEnum("extraction_status", [
  "PENDING",
  "ASSISTED",
  "REVIEWED",
  "REJECTED",
]);

export const workEntryVerificationStatusEnum = pgEnum(
  "work_entry_verification_status",
  ["UNVERIFIED", "VERIFIED", "CHANGES_REQUESTED"],
);

export const shiftSubmissionStatusEnum = pgEnum("shift_submission_status", [
  "OPEN",
  "SUBMITTED",
]);

export const workEntryChangeTypeEnum = pgEnum("work_entry_change_type", [
  "CREATED",
  "EDITED",
  "VERIFIED",
  "COMMENTED",
  "SUBMITTED",
  "REOPENED",
]);

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  startLocal: time("start_local").notNull(),
  endLocal: time("end_local").notNull(),
  crossesMidnight: boolean("crosses_midnight").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  nativeUnitLabel: varchar("native_unit_label", { length: 48 }).notNull(),
  panelsPerNativeUnit: numeric("panels_per_native_unit", {
    precision: 12,
    scale: 4,
  })
    .notNull()
    .default("1"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const stations = pgTable("stations", {
  id: uuid("id").defaultRandom().primaryKey(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  employeeCode: varchar("employee_code", { length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  givenName: varchar("given_name", { length: 64 }).notNull(),
  familyName: varchar("family_name", { length: 64 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  status: employeeStatusEnum("status").notNull().default("ACTIVE"),
  defaultDepartmentId: uuid("default_department_id").references(
    () => departments.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const employeeStationAssignments = pgTable(
  "employee_station_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "restrict" }),
    shiftId: uuid("shift_id").references(() => shifts.id, {
      onDelete: "set null",
    }),
    isPrimary: boolean("is_primary").notNull().default(false),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("employee_station_assignments_active_idx").on(
      table.employeeId,
      table.stationId,
      table.startsAt,
    ),
  ],
);

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobNumber: varchar("job_number", { length: 48 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 120 }).notNull(),
  productName: varchar("product_name", { length: 120 }).notNull(),
  status: jobStatusEnum("status").notNull().default("PLANNED"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const jobReleases = pgTable(
  "job_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    releaseCode: varchar("release_code", { length: 32 }).notNull(),
    revisionCode: varchar("revision_code", { length: 32 }).notNull(),
    status: releaseStatusEnum("status").notNull().default("PENDING_BASELINE"),
    panelBaseline: numeric("panel_baseline", {
      precision: 12,
      scale: 2,
    }),
    baselineApprovedAt: timestamp("baseline_approved_at", {
      withTimezone: true,
      mode: "date",
    }),
    baselineApprovedByUserId: text("baseline_approved_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    baselineSourceDocumentId: uuid("baseline_source_document_id"),
    baselineStaleAt: timestamp("baseline_stale_at", {
      withTimezone: true,
      mode: "date",
    }),
    baselineStaleReason: text("baseline_stale_reason"),
    plannedShipDate: date("planned_ship_date"),
    dueDate: date("due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("job_releases_job_release_unique").on(
      table.jobId,
      table.releaseCode,
    ),
  ],
);

export const jobDocuments = pgTable("job_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobReleaseId: uuid("job_release_id")
    .notNull()
    .references(() => jobReleases.id, { onDelete: "cascade" }),
  kind: documentKindEnum("kind").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
  storageProvider: varchar("storage_provider", { length: 32 }).notNull(),
  storageKey: text("storage_key").notNull(),
  storageUrl: text("storage_url"),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  extractionStatus: extractionStatusEnum("extraction_status")
    .notNull()
    .default("PENDING"),
  extractionPayload: jsonb("extraction_payload"),
  extractedAt: timestamp("extracted_at", {
    withTimezone: true,
    mode: "date",
  }),
  isCurrent: boolean("is_current").notNull().default(true),
});

export const shiftSubmissions = pgTable(
  "shift_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "restrict" }),
    businessDate: date("business_date").notNull(),
    status: shiftSubmissionStatusEnum("status").notNull().default("OPEN"),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "date",
    }),
    submittedByUserId: text("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reopenedAt: timestamp("reopened_at", {
      withTimezone: true,
      mode: "date",
    }),
    reopenedByUserId: text("reopened_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reopenReason: text("reopen_reason"),
    reopenCount: integer("reopen_count").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("shift_submissions_employee_shift_station_day_idx").on(
      table.employeeId,
      table.shiftId,
      table.stationId,
      table.businessDate,
    ),
  ],
);

export const workEntries = pgTable("work_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => shiftSubmissions.id, { onDelete: "cascade" }),
  jobReleaseId: uuid("job_release_id")
    .notNull()
    .references(() => jobReleases.id, { onDelete: "restrict" }),
  stationId: uuid("station_id")
    .notNull()
    .references(() => stations.id, { onDelete: "restrict" }),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  nativeUnitType: varchar("native_unit_type", { length: 48 }).notNull(),
  nativeQuantity: numeric("native_quantity", {
    precision: 12,
    scale: 2,
  }).notNull(),
  panelEquivalentQuantity: numeric("panel_equivalent_quantity", {
    precision: 12,
    scale: 2,
  }).notNull(),
  businessDate: date("business_date").notNull(),
  shiftId: uuid("shift_id")
    .notNull()
    .references(() => shifts.id, { onDelete: "restrict" }),
  verificationStatus: workEntryVerificationStatusEnum("verification_status")
    .notNull()
    .default("UNVERIFIED"),
  isLocked: boolean("is_locked").notNull().default(false),
  versionCount: integer("version_count").notNull().default(1),
  editedAt: timestamp("edited_at", {
    withTimezone: true,
    mode: "date",
  }),
  editedByUserId: text("edited_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  editReason: text("edit_reason"),
  verifiedAt: timestamp("verified_at", {
    withTimezone: true,
    mode: "date",
  }),
  verifiedByUserId: text("verified_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  leadCommentCount: integer("lead_comment_count").notNull().default(0),
  isRework: boolean("is_rework").notNull().default(false),
  faultDepartmentId: uuid("fault_department_id").references(
    () => departments.id,
    { onDelete: "set null" },
  ),
  fixingDepartmentId: uuid("fixing_department_id").references(
    () => departments.id,
    { onDelete: "set null" },
  ),
  reworkNotes: text("rework_notes"),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const workEntryVersions = pgTable(
  "work_entry_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workEntryId: uuid("work_entry_id")
      .notNull()
      .references(() => workEntries.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    changeType: workEntryChangeTypeEnum("change_type").notNull(),
    changedByUserId: text("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("work_entry_versions_entry_version_idx").on(
      table.workEntryId,
      table.versionNumber,
    ),
  ],
);

export const workEntryComments = pgTable("work_entry_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workEntryId: uuid("work_entry_id")
    .notNull()
    .references(() => workEntries.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});
