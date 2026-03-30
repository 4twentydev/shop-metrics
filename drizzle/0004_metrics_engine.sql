CREATE TYPE "public"."rework_source" AS ENUM('UNKNOWN', 'INTERNAL_FAULT', 'INSTALLER_FAULT');
CREATE TYPE "public"."metric_window" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL');
CREATE TYPE "public"."metric_scope" AS ENUM('EMPLOYEE', 'DEPARTMENT', 'JOB', 'RELEASE', 'COMPANY', 'PART_FAMILY');

ALTER TABLE "job_releases"
  ADD COLUMN "part_family" varchar(64);

ALTER TABLE "work_entries"
  ADD COLUMN "rework_source" "rework_source" DEFAULT 'UNKNOWN' NOT NULL;

CREATE TABLE "metric_targets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "window_type" "metric_window" NOT NULL,
  "scope_type" "metric_scope" NOT NULL,
  "scope_reference_id" uuid,
  "scope_key" varchar(128),
  "metric_key" varchar(96) NOT NULL,
  "target_value" numeric(12, 2) NOT NULL,
  "unit_label" varchar(48) NOT NULL,
  "effective_start" date NOT NULL,
  "effective_end" date,
  "notes" text,
  "entered_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "metric_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "window_type" "metric_window" NOT NULL,
  "window_start" date NOT NULL,
  "window_end" date NOT NULL,
  "scope_type" "metric_scope" NOT NULL,
  "scope_reference_id" uuid,
  "scope_key" varchar(128),
  "metrics" jsonb NOT NULL,
  "target_summary" jsonb NOT NULL,
  "source_summary" jsonb NOT NULL,
  "created_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "metric_targets"
  ADD CONSTRAINT "metric_targets_entered_by_user_id_users_id_fk"
  FOREIGN KEY ("entered_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "metric_snapshots"
  ADD CONSTRAINT "metric_snapshots_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "job_releases_part_family_idx" ON "job_releases" USING btree ("part_family");
CREATE INDEX "metric_targets_scope_window_idx" ON "metric_targets" USING btree ("window_type", "scope_type", "scope_reference_id", "scope_key", "effective_start");
CREATE INDEX "metric_snapshots_window_scope_idx" ON "metric_snapshots" USING btree ("window_type", "window_start", "window_end", "scope_type", "scope_reference_id", "scope_key");
