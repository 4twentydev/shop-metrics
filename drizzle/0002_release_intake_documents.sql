CREATE TYPE "public"."release_intake_batch_status" AS ENUM('PENDING_REVIEW', 'HANDOFF_READY');
CREATE TYPE "public"."supersede_decision" AS ENUM('PENDING', 'SUPERSEDE', 'KEEP_REFERENCE');

CREATE TABLE "release_intake_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_release_id" uuid NOT NULL,
  "upload_label" varchar(120) NOT NULL,
  "notes" text,
  "status" "release_intake_batch_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
  "affects_approved_baseline" boolean DEFAULT false NOT NULL,
  "extraction_handoff_at" timestamp with time zone,
  "uploaded_by_user_id" text NOT NULL,
  "reviewed_by_user_id" text,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "release_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_release_id" uuid NOT NULL,
  "intake_batch_id" uuid,
  "author_user_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "job_releases"
  ADD COLUMN "baseline_stale_source_batch_id" uuid;

ALTER TABLE "job_documents"
  ADD COLUMN "intake_batch_id" uuid,
  ADD COLUMN "document_family" varchar(64) DEFAULT 'LEGACY' NOT NULL,
  ADD COLUMN "revision_number" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "supersede_decision" "supersede_decision" DEFAULT 'PENDING' NOT NULL,
  ADD COLUMN "supersedes_document_id" uuid,
  ADD COLUMN "reviewed_at" timestamp with time zone,
  ADD COLUMN "reviewed_by_user_id" text,
  ADD COLUMN "affects_baseline" boolean DEFAULT false NOT NULL,
  ADD COLUMN "uploader_notes" text,
  ADD COLUMN "extraction_handoff_at" timestamp with time zone;

ALTER TABLE "release_intake_batches"
  ADD CONSTRAINT "release_intake_batches_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "release_intake_batches"
  ADD CONSTRAINT "release_intake_batches_uploaded_by_user_id_users_id_fk"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "release_intake_batches"
  ADD CONSTRAINT "release_intake_batches_reviewed_by_user_id_users_id_fk"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "release_comments"
  ADD CONSTRAINT "release_comments_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "release_comments"
  ADD CONSTRAINT "release_comments_intake_batch_id_release_intake_batches_id_fk"
  FOREIGN KEY ("intake_batch_id") REFERENCES "public"."release_intake_batches"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "release_comments"
  ADD CONSTRAINT "release_comments_author_user_id_users_id_fk"
  FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "job_releases"
  ADD CONSTRAINT "job_releases_baseline_stale_source_batch_id_release_intake_batches_id_fk"
  FOREIGN KEY ("baseline_stale_source_batch_id") REFERENCES "public"."release_intake_batches"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_intake_batch_id_release_intake_batches_id_fk"
  FOREIGN KEY ("intake_batch_id") REFERENCES "public"."release_intake_batches"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_supersedes_document_id_job_documents_id_fk"
  FOREIGN KEY ("supersedes_document_id") REFERENCES "public"."job_documents"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_reviewed_by_user_id_users_id_fk"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
