CREATE TYPE "public"."extraction_failure_reason" AS ENUM(
  'DOCUMENT_SET_INVALID',
  'OCR_QUALITY',
  'MODEL_FAILURE',
  'NORMALIZATION_ERROR',
  'TIMEOUT',
  'HUMAN_REVIEW_REQUIRED',
  'UNKNOWN'
);
--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL');
--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED');
--> statement-breakpoint
ALTER TABLE "release_extraction_runs"
  ADD COLUMN "failure_reason" "extraction_failure_reason",
  ADD COLUMN "failure_triage_notes" text,
  ADD COLUMN "rejected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "display_playlists"
  ADD COLUMN "department_id" uuid,
  ADD COLUMN "shift_id" uuid,
  ADD COLUMN "starts_at_local" time,
  ADD COLUMN "ends_at_local" time;
--> statement-breakpoint
ALTER TABLE "display_playlists"
  ADD CONSTRAINT "display_playlists_department_id_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "display_playlists"
  ADD CONSTRAINT "display_playlists_shift_id_shifts_id_fk"
  FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "display_playlists_schedule_idx"
  ON "display_playlists" USING btree ("is_active","department_id","shift_id");
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "readiness_notification_id" uuid NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "status" "notification_delivery_status" DEFAULT 'PENDING' NOT NULL,
  "provider" varchar(64),
  "provider_message_id" varchar(255),
  "sent_at" timestamp with time zone,
  "error_message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_deliveries_readiness_notification_id_release_readiness_notifications_id_fk"
    FOREIGN KEY ("readiness_notification_id") REFERENCES "public"."release_readiness_notifications"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_unique_idx"
  ON "notification_deliveries" USING btree ("readiness_notification_id","channel","recipient");
--> statement-breakpoint
CREATE TABLE "report_export_artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "delivery_id" uuid NOT NULL,
  "artifact_type" varchar(32) NOT NULL,
  "dataset" varchar(32),
  "format" varchar(32),
  "file_name" varchar(255) NOT NULL,
  "content_type" varchar(128) NOT NULL,
  "storage_provider" varchar(32),
  "storage_key" text,
  "storage_url" text,
  "checksum_sha256" varchar(64),
  "byte_size" integer,
  "manifest_entry" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_export_artifacts_delivery_id_report_export_deliveries_id_fk"
    FOREIGN KEY ("delivery_id") REFERENCES "public"."report_export_deliveries"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "report_export_artifacts_delivery_idx"
  ON "report_export_artifacts" USING btree ("delivery_id","created_at");
