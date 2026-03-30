CREATE TYPE "public"."user_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."cleanup_status" AS ENUM('ACTIVE', 'EXPIRED', 'DELETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."config_change_action" AS ENUM('CREATED', 'UPDATED', 'SOFT_DELETED', 'RESTORED');--> statement-breakpoint
CREATE TYPE "public"."display_alert_status" AS ENUM('ACTIVE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."display_alert_type" AS ENUM('STALE_HEARTBEAT');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('BASELINE_PDF', 'REVISION_PDF', 'ROUTER_PDF', 'QUALITY_PDF');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE');--> statement-breakpoint
CREATE TYPE "public"."extraction_failure_reason" AS ENUM('DOCUMENT_SET_INVALID', 'OCR_QUALITY', 'MODEL_FAILURE', 'NORMALIZATION_ERROR', 'TIMEOUT', 'HUMAN_REVIEW_REQUIRED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."extraction_review_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."extraction_run_status" AS ENUM('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('PENDING', 'ASSISTED', 'REVIEWED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PLANNED', 'ACTIVE', 'HOLD', 'COMPLETE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."metric_scope" AS ENUM('EMPLOYEE', 'DEPARTMENT', 'JOB', 'RELEASE', 'COMPANY', 'PART_FAMILY');--> statement-breakpoint
CREATE TYPE "public"."metric_window" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_event_type" AS ENUM('STALE_BASELINE', 'FAILED_EXTRACTION', 'DISPLAY_STALE_HEARTBEAT');--> statement-breakpoint
CREATE TYPE "public"."readiness_notification_status" AS ENUM('ACTIVE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."readiness_notification_type" AS ENUM('STALE_BASELINE', 'FAILED_EXTRACTION');--> statement-breakpoint
CREATE TYPE "public"."release_intake_batch_status" AS ENUM('PENDING_REVIEW', 'HANDOFF_READY');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('PENDING_BASELINE', 'READY', 'IN_PRODUCTION', 'SUBMITTED', 'LOCKED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."report_delivery_status" AS ENUM('GENERATED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."report_package_type" AS ENUM('SINGLE', 'BUNDLE');--> statement-breakpoint
CREATE TYPE "public"."report_view" AS ENUM('EXECUTIVE', 'DEPARTMENT', 'EMPLOYEE', 'JOB', 'RELEASE', 'ACCOUNTABILITY', 'REWORK', 'BOTTLENECK');--> statement-breakpoint
CREATE TYPE "public"."rework_source" AS ENUM('UNKNOWN', 'INTERNAL_FAULT', 'INSTALLER_FAULT');--> statement-breakpoint
CREATE TYPE "public"."shift_submission_status" AS ENUM('OPEN', 'SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."supersede_decision" AS ENUM('PENDING', 'SUPERSEDE', 'KEEP_REFERENCE');--> statement-breakpoint
CREATE TYPE "public"."work_entry_change_type" AS ENUM('CREATED', 'EDITED', 'VERIFIED', 'COMMENTED', 'SUBMITTED', 'REOPENED');--> statement-breakpoint
CREATE TYPE "public"."work_entry_verification_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'CHANGES_REQUESTED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" varchar(96) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"transports" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"aaguid" text,
	"metadata" jsonb,
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(96) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" "user_status" DEFAULT 'INVITED' NOT NULL,
	"active_role" varchar(64) DEFAULT 'employee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(96) NOT NULL,
	"native_unit_label" varchar(48) NOT NULL,
	"panels_per_native_unit" numeric(12, 4) DEFAULT '1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "display_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid,
	"screen_heartbeat_id" uuid NOT NULL,
	"alert_type" "display_alert_type" NOT NULL,
	"status" "display_alert_status" DEFAULT 'ACTIVE' NOT NULL,
	"message" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "display_playlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "display_playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"rotation_seconds" integer DEFAULT 20 NOT NULL,
	"heartbeat_interval_seconds" integer DEFAULT 60 NOT NULL,
	"department_id" uuid,
	"shift_id" uuid,
	"starts_at_local" time,
	"ends_at_local" time,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "display_playlists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "display_screen_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid,
	"screen_key" varchar(120) NOT NULL,
	"screen_label" varchar(160),
	"last_template_slug" varchar(120),
	"last_path" text,
	"last_anchor_date" date,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "display_screen_heartbeats_screen_key_unique" UNIQUE("screen_key")
);
--> statement-breakpoint
CREATE TABLE "employee_station_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"shift_id" uuid,
	"is_primary" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"employee_code" varchar(32) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"given_name" varchar(64) NOT NULL,
	"family_name" varchar(64) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	"default_department_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "job_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_release_id" uuid NOT NULL,
	"intake_batch_id" uuid,
	"kind" "document_kind" NOT NULL,
	"document_family" varchar(64) NOT NULL,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"supersede_decision" "supersede_decision" DEFAULT 'PENDING' NOT NULL,
	"supersedes_document_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(128) NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"storage_provider" varchar(32) NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"affects_baseline" boolean DEFAULT false NOT NULL,
	"uploader_notes" text,
	"extraction_status" "extraction_status" DEFAULT 'PENDING' NOT NULL,
	"extraction_payload" jsonb,
	"extracted_at" timestamp with time zone,
	"extraction_handoff_at" timestamp with time zone,
	"is_current" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"release_code" varchar(32) NOT NULL,
	"revision_code" varchar(32) NOT NULL,
	"status" "release_status" DEFAULT 'PENDING_BASELINE' NOT NULL,
	"part_family" varchar(64),
	"panel_baseline" numeric(12, 2),
	"baseline_approved_at" timestamp with time zone,
	"baseline_approved_by_user_id" text,
	"baseline_source_document_id" uuid,
	"baseline_stale_at" timestamp with time zone,
	"baseline_stale_reason" text,
	"baseline_stale_source_batch_id" uuid,
	"baseline_approved_extraction_run_id" uuid,
	"planned_ship_date" date,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_number" varchar(48) NOT NULL,
	"customer_name" varchar(120) NOT NULL,
	"product_name" varchar(120) NOT NULL,
	"status" "job_status" DEFAULT 'PLANNED' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "metric_target_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_target_id" uuid NOT NULL,
	"change_action" "config_change_action" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" text,
	"deletion_reason" text,
	"entered_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"readiness_notification_id" uuid,
	"display_alert_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"provider" varchar(64),
	"provider_message_id" varchar(255),
	"sent_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_escalation_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"role_slug" varchar(64) NOT NULL,
	"escalation_order" integer DEFAULT 1 NOT NULL,
	"repeat_minutes" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"minimum_repeat_minutes" integer DEFAULT 60 NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_release_id" uuid NOT NULL,
	"intake_batch_id" uuid,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"processing_metadata" jsonb,
	"raw_output" jsonb,
	"normalized_output" jsonb,
	"reviewed_output" jsonb,
	"confidence" numeric(5, 4),
	"error_message" text,
	"failure_reason" "extraction_failure_reason",
	"failure_triage_notes" text,
	"reviewer_notes" text,
	"created_by_user_id" text NOT NULL,
	"reviewed_by_user_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "release_readiness_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_release_id" uuid NOT NULL,
	"notification_type" "readiness_notification_type" NOT NULL,
	"status" "readiness_notification_status" DEFAULT 'ACTIVE' NOT NULL,
	"message" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
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
	"retention_days" integer DEFAULT 30 NOT NULL,
	"expires_at" timestamp with time zone,
	"cleanup_status" "cleanup_status" DEFAULT 'ACTIVE' NOT NULL,
	"cleaned_up_at" timestamp with time zone,
	"manifest_entry" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_export_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_view" "report_view" NOT NULL,
	"window_type" "metric_window" NOT NULL,
	"window_start" date NOT NULL,
	"window_end" date NOT NULL,
	"scope_type" "metric_scope",
	"scope_reference_id" uuid,
	"scope_key" varchar(128),
	"template_id" uuid,
	"package_type" "report_package_type" DEFAULT 'SINGLE' NOT NULL,
	"requested_formats" jsonb NOT NULL,
	"requested_datasets" jsonb NOT NULL,
	"package_manifest" jsonb NOT NULL,
	"status" "report_delivery_status" DEFAULT 'GENERATED' NOT NULL,
	"primary_file_name" varchar(255),
	"primary_content_type" varchar(128),
	"storage_provider" varchar(32),
	"storage_key" text,
	"storage_url" text,
	"byte_size" integer,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"expires_at" timestamp with time zone,
	"cleanup_status" "cleanup_status" DEFAULT 'ACTIVE' NOT NULL,
	"cleaned_up_at" timestamp with time zone,
	"requested_by_user_id" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_template_id" uuid NOT NULL,
	"change_action" "config_change_action" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"view_type" "report_view" NOT NULL,
	"default_window_type" "metric_window" DEFAULT 'DAILY' NOT NULL,
	"scope_type" "metric_scope",
	"scope_reference_id" uuid,
	"scope_key" varchar(128),
	"section_config" jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" text,
	"deletion_reason" text,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(96) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"start_local" time NOT NULL,
	"end_local" time NOT NULL,
	"crosses_midnight" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(96) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
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
	"rework_source" "rework_source" DEFAULT 'UNKNOWN' NOT NULL,
	"fault_department_id" uuid,
	"fixing_department_id" uuid,
	"rework_notes" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_entry_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_entry_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_alerts" ADD CONSTRAINT "display_alerts_playlist_id_display_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."display_playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_alerts" ADD CONSTRAINT "display_alerts_screen_heartbeat_id_display_screen_heartbeats_id_fk" FOREIGN KEY ("screen_heartbeat_id") REFERENCES "public"."display_screen_heartbeats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlist_items" ADD CONSTRAINT "display_playlist_items_playlist_id_display_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."display_playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlist_items" ADD CONSTRAINT "display_playlist_items_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlists" ADD CONSTRAINT "display_playlists_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlists" ADD CONSTRAINT "display_playlists_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlists" ADD CONSTRAINT "display_playlists_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_playlists" ADD CONSTRAINT "display_playlists_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "display_screen_heartbeats" ADD CONSTRAINT "display_screen_heartbeats_playlist_id_display_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."display_playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_station_assignments" ADD CONSTRAINT "employee_station_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_station_assignments" ADD CONSTRAINT "employee_station_assignments_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_station_assignments" ADD CONSTRAINT "employee_station_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_department_id_departments_id_fk" FOREIGN KEY ("default_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_releases" ADD CONSTRAINT "job_releases_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_releases" ADD CONSTRAINT "job_releases_baseline_approved_by_user_id_users_id_fk" FOREIGN KEY ("baseline_approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_target_versions" ADD CONSTRAINT "metric_target_versions_metric_target_id_metric_targets_id_fk" FOREIGN KEY ("metric_target_id") REFERENCES "public"."metric_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_target_versions" ADD CONSTRAINT "metric_target_versions_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_targets" ADD CONSTRAINT "metric_targets_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_targets" ADD CONSTRAINT "metric_targets_entered_by_user_id_users_id_fk" FOREIGN KEY ("entered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_readiness_notification_id_release_readiness_notifications_id_fk" FOREIGN KEY ("readiness_notification_id") REFERENCES "public"."release_readiness_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_display_alert_id_display_alerts_id_fk" FOREIGN KEY ("display_alert_id") REFERENCES "public"."display_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_escalation_policies" ADD CONSTRAINT "notification_escalation_policies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_escalation_policies" ADD CONSTRAINT "notification_escalation_policies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comments" ADD CONSTRAINT "release_comments_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comments" ADD CONSTRAINT "release_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_extraction_runs" ADD CONSTRAINT "release_extraction_runs_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_extraction_runs" ADD CONSTRAINT "release_extraction_runs_intake_batch_id_release_intake_batches_id_fk" FOREIGN KEY ("intake_batch_id") REFERENCES "public"."release_intake_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_extraction_runs" ADD CONSTRAINT "release_extraction_runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_extraction_runs" ADD CONSTRAINT "release_extraction_runs_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_intake_batches" ADD CONSTRAINT "release_intake_batches_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_intake_batches" ADD CONSTRAINT "release_intake_batches_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_intake_batches" ADD CONSTRAINT "release_intake_batches_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_readiness_notifications" ADD CONSTRAINT "release_readiness_notifications_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_export_artifacts" ADD CONSTRAINT "report_export_artifacts_delivery_id_report_export_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."report_export_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_export_deliveries" ADD CONSTRAINT "report_export_deliveries_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_export_deliveries" ADD CONSTRAINT "report_export_deliveries_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_template_versions" ADD CONSTRAINT "report_template_versions_report_template_id_report_templates_id_fk" FOREIGN KEY ("report_template_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_template_versions" ADD CONSTRAINT "report_template_versions_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_submissions" ADD CONSTRAINT "shift_submissions_reopened_by_user_id_users_id_fk" FOREIGN KEY ("reopened_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_submission_id_shift_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."shift_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_job_release_id_job_releases_id_fk" FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_fault_department_id_departments_id_fk" FOREIGN KEY ("fault_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_fixing_department_id_departments_id_fk" FOREIGN KEY ("fixing_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entries" ADD CONSTRAINT "work_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entry_comments" ADD CONSTRAINT "work_entry_comments_work_entry_id_work_entries_id_fk" FOREIGN KEY ("work_entry_id") REFERENCES "public"."work_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entry_comments" ADD CONSTRAINT "work_entry_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entry_versions" ADD CONSTRAINT "work_entry_versions_work_entry_id_work_entries_id_fk" FOREIGN KEY ("work_entry_id") REFERENCES "public"."work_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_entry_versions" ADD CONSTRAINT "work_entry_versions_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "display_alerts_unique_idx" ON "display_alerts" USING btree ("screen_heartbeat_id","alert_type");--> statement-breakpoint
CREATE UNIQUE INDEX "display_playlist_items_unique_idx" ON "display_playlist_items" USING btree ("playlist_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "display_playlist_items_position_idx" ON "display_playlist_items" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE INDEX "display_playlists_active_idx" ON "display_playlists" USING btree ("is_active","slug");--> statement-breakpoint
CREATE INDEX "display_playlists_schedule_idx" ON "display_playlists" USING btree ("is_active","department_id","shift_id");--> statement-breakpoint
CREATE INDEX "display_screen_heartbeats_last_seen_idx" ON "display_screen_heartbeats" USING btree ("last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_station_assignments_active_idx" ON "employee_station_assignments" USING btree ("employee_id","station_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_releases_job_release_unique" ON "job_releases" USING btree ("job_id","release_code");--> statement-breakpoint
CREATE INDEX "job_releases_part_family_idx" ON "job_releases" USING btree ("part_family");--> statement-breakpoint
CREATE INDEX "metric_snapshots_window_scope_idx" ON "metric_snapshots" USING btree ("window_type","window_start","window_end","scope_type","scope_reference_id","scope_key");--> statement-breakpoint
CREATE INDEX "metric_target_versions_target_idx" ON "metric_target_versions" USING btree ("metric_target_id","created_at");--> statement-breakpoint
CREATE INDEX "metric_targets_scope_window_idx" ON "metric_targets" USING btree ("window_type","scope_type","scope_reference_id","scope_key","effective_start");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_unique_idx" ON "notification_deliveries" USING btree ("event_type","channel","recipient","readiness_notification_id","display_alert_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_escalation_policies_unique_idx" ON "notification_escalation_policies" USING btree ("event_type","channel","role_slug","escalation_order");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_unique_idx" ON "notification_preferences" USING btree ("user_id","event_type","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "release_readiness_notifications_unique_idx" ON "release_readiness_notifications" USING btree ("job_release_id","notification_type");--> statement-breakpoint
CREATE INDEX "release_readiness_notifications_status_idx" ON "release_readiness_notifications" USING btree ("status","detected_at");--> statement-breakpoint
CREATE INDEX "report_export_artifacts_delivery_idx" ON "report_export_artifacts" USING btree ("delivery_id","created_at");--> statement-breakpoint
CREATE INDEX "report_export_deliveries_window_idx" ON "report_export_deliveries" USING btree ("report_view","window_type","window_start","scope_type","scope_key");--> statement-breakpoint
CREATE INDEX "report_template_versions_template_idx" ON "report_template_versions" USING btree ("report_template_id","created_at");--> statement-breakpoint
CREATE INDEX "report_templates_view_scope_idx" ON "report_templates" USING btree ("view_type","scope_type","scope_reference_id","scope_key");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_submissions_employee_shift_station_day_idx" ON "shift_submissions" USING btree ("employee_id","shift_id","station_id","business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "work_entry_versions_entry_version_idx" ON "work_entry_versions" USING btree ("work_entry_id","version_number");