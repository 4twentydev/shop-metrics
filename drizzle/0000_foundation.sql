CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "public"."document_kind" AS ENUM('BASELINE_PDF', 'REVISION_PDF', 'ROUTER_PDF', 'QUALITY_PDF');
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE');
CREATE TYPE "public"."extraction_status" AS ENUM('PENDING', 'ASSISTED', 'REVIEWED', 'REJECTED');
CREATE TYPE "public"."job_status" AS ENUM('PLANNED', 'ACTIVE', 'HOLD', 'COMPLETE', 'CANCELLED');
CREATE TYPE "public"."release_status" AS ENUM('PENDING_BASELINE', 'READY', 'IN_PRODUCTION', 'SUBMITTED', 'LOCKED', 'ARCHIVED');
CREATE TYPE "public"."user_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "name" varchar(96) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);

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

CREATE TABLE "verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

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

CREATE UNIQUE INDEX "employee_station_assignments_active_idx"
  ON "employee_station_assignments" USING btree ("employee_id", "station_id", "starts_at");

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

CREATE TABLE "job_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL,
  "release_code" varchar(32) NOT NULL,
  "revision_code" varchar(32) NOT NULL,
  "status" "release_status" DEFAULT 'PENDING_BASELINE' NOT NULL,
  "panel_baseline" numeric(12, 2),
  "baseline_approved_at" timestamp with time zone,
  "baseline_approved_by_user_id" text,
  "baseline_source_document_id" uuid,
  "baseline_stale_at" timestamp with time zone,
  "baseline_stale_reason" text,
  "planned_ship_date" date,
  "due_date" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "job_releases_job_release_unique"
  ON "job_releases" USING btree ("job_id", "release_code");

CREATE TABLE "job_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_release_id" uuid NOT NULL,
  "kind" "document_kind" NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "content_type" varchar(128) NOT NULL,
  "byte_size" integer NOT NULL,
  "checksum_sha256" varchar(64) NOT NULL,
  "storage_provider" varchar(32) NOT NULL,
  "storage_key" text NOT NULL,
  "storage_url" text,
  "uploaded_by_user_id" text,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "extraction_status" "extraction_status" DEFAULT 'PENDING' NOT NULL,
  "extraction_payload" jsonb,
  "extracted_at" timestamp with time zone,
  "is_current" boolean DEFAULT true NOT NULL
);

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

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "passkeys"
  ADD CONSTRAINT "passkeys_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stations"
  ADD CONSTRAINT "stations_department_id_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_default_department_id_departments_id_fk"
  FOREIGN KEY ("default_department_id") REFERENCES "public"."departments"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "employee_station_assignments"
  ADD CONSTRAINT "employee_station_assignments_employee_id_employees_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "employee_station_assignments"
  ADD CONSTRAINT "employee_station_assignments_station_id_stations_id_fk"
  FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "employee_station_assignments"
  ADD CONSTRAINT "employee_station_assignments_shift_id_shifts_id_fk"
  FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_releases"
  ADD CONSTRAINT "job_releases_job_id_jobs_id_fk"
  FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "job_releases"
  ADD CONSTRAINT "job_releases_baseline_approved_by_user_id_users_id_fk"
  FOREIGN KEY ("baseline_approved_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "public"."job_releases"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "job_documents"
  ADD CONSTRAINT "job_documents_uploaded_by_user_id_users_id_fk"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "job_releases"
  ADD CONSTRAINT "job_releases_baseline_source_document_id_job_documents_id_fk"
  FOREIGN KEY ("baseline_source_document_id") REFERENCES "public"."job_documents"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
