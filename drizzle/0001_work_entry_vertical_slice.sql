CREATE TYPE "public"."shift_submission_status" AS ENUM('OPEN', 'SUBMITTED');
CREATE TYPE "public"."work_entry_change_type" AS ENUM('CREATED', 'EDITED', 'VERIFIED', 'COMMENTED', 'SUBMITTED', 'REOPENED');
CREATE TYPE "public"."work_entry_verification_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'CHANGES_REQUESTED');

CREATE TABLE "shift_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "station_id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "shift_id" uuid NOT NULL,
  "business_date" date NOT NULL,
  "status" "shift_submission_status" DEFAULT 'OPEN' NOT NULL,
  "submitted_at" timestamp with time zone,
  "submitted_by_user_id" text,
  "reopened_at" timestamp with time zone,
  "reopened_by_user_id" text,
  "reopen_reason" text,
  "reopen_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "shift_submissions_employee_shift_station_day_idx"
  ON "shift_submissions" USING btree ("employee_id", "shift_id", "station_id", "business_date");

CREATE TABLE "work_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid NOT NULL,
  "job_release_id" uuid NOT NULL,
  "station_id" uuid NOT NULL,
  "department_id" uuid NOT NULL,
  "native_unit_type" varchar(48) NOT NULL,
  "native_quantity" numeric(12, 2) NOT NULL,
  "panel_equivalent_quantity" numeric(12, 2) NOT NULL,
  "business_date" date NOT NULL,
  "shift_id" uuid NOT NULL,
  "verification_status" "work_entry_verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "version_count" integer DEFAULT 1 NOT NULL,
  "edited_at" timestamp with time zone,
  "edited_by_user_id" text,
  "edit_reason" text,
  "verified_at" timestamp with time zone,
  "verified_by_user_id" text,
  "lead_comment_count" integer DEFAULT 0 NOT NULL,
  "is_rework" boolean DEFAULT false NOT NULL,
  "fault_department_id" uuid,
  "fixing_department_id" uuid,
  "rework_notes" text,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "work_entry_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "work_entry_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "change_type" "work_entry_change_type" NOT NULL,
  "changed_by_user_id" text,
  "note" text,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "work_entry_versions_entry_version_idx"
  ON "work_entry_versions" USING btree ("work_entry_id", "version_number");

CREATE TABLE "work_entry_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "work_entry_id" uuid NOT NULL,
  "author_user_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_employee_id_employees_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_station_id_stations_id_fk"
  FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_department_id_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_shift_id_shifts_id_fk"
  FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_submitted_by_user_id_users_id_fk"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "shift_submissions"
  ADD CONSTRAINT "shift_submissions_reopened_by_user_id_users_id_fk"
  FOREIGN KEY ("reopened_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_submission_id_shift_submissions_id_fk"
  FOREIGN KEY ("submission_id") REFERENCES "public"."shift_submissions"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_station_id_stations_id_fk"
  FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_department_id_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_shift_id_shifts_id_fk"
  FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_edited_by_user_id_users_id_fk"
  FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_verified_by_user_id_users_id_fk"
  FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_fault_department_id_departments_id_fk"
  FOREIGN KEY ("fault_department_id") REFERENCES "public"."departments"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_fixing_department_id_departments_id_fk"
  FOREIGN KEY ("fixing_department_id") REFERENCES "public"."departments"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entries"
  ADD CONSTRAINT "work_entries_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "work_entry_versions"
  ADD CONSTRAINT "work_entry_versions_work_entry_id_work_entries_id_fk"
  FOREIGN KEY ("work_entry_id") REFERENCES "public"."work_entries"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "work_entry_versions"
  ADD CONSTRAINT "work_entry_versions_changed_by_user_id_users_id_fk"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "work_entry_comments"
  ADD CONSTRAINT "work_entry_comments_work_entry_id_work_entries_id_fk"
  FOREIGN KEY ("work_entry_id") REFERENCES "public"."work_entries"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "work_entry_comments"
  ADD CONSTRAINT "work_entry_comments_author_user_id_users_id_fk"
  FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;
