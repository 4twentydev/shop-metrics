CREATE TYPE "public"."extraction_run_status" AS ENUM('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "public"."extraction_review_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "release_extraction_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_release_id" uuid NOT NULL,
  "intake_batch_id" uuid,
  "provider" varchar(32) NOT NULL,
  "model" varchar(80) NOT NULL,
  "status" "extraction_run_status" DEFAULT 'QUEUED' NOT NULL,
  "review_status" "extraction_review_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
  "attempt_number" integer DEFAULT 1 NOT NULL,
  "source_document_ids" jsonb NOT NULL,
  "raw_output" jsonb,
  "normalized_output" jsonb,
  "reviewed_output" jsonb,
  "confidence" numeric(5, 4),
  "error_message" text,
  "reviewer_notes" text,
  "created_by_user_id" text NOT NULL,
  "reviewed_by_user_id" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "job_releases"
  ADD COLUMN "baseline_approved_extraction_run_id" uuid;

ALTER TABLE "release_extraction_runs"
  ADD CONSTRAINT "release_extraction_runs_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "release_extraction_runs"
  ADD CONSTRAINT "release_extraction_runs_intake_batch_id_release_intake_batches_id_fk"
  FOREIGN KEY ("intake_batch_id") REFERENCES "public"."release_intake_batches"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "release_extraction_runs"
  ADD CONSTRAINT "release_extraction_runs_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "release_extraction_runs"
  ADD CONSTRAINT "release_extraction_runs_reviewed_by_user_id_users_id_fk"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_releases"
  ADD CONSTRAINT "job_releases_baseline_approved_extraction_run_id_release_extraction_runs_id_fk"
  FOREIGN KEY ("baseline_approved_extraction_run_id") REFERENCES "public"."release_extraction_runs"("id")
  ON DELETE set null ON UPDATE no action;
