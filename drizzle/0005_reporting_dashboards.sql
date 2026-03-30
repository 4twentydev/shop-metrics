CREATE TYPE "public"."report_view" AS ENUM(
  'EXECUTIVE',
  'DEPARTMENT',
  'EMPLOYEE',
  'JOB',
  'RELEASE',
  'ACCOUNTABILITY',
  'REWORK',
  'BOTTLENECK'
);

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
  "created_by_user_id" text NOT NULL,
  "updated_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_templates_slug_unique" UNIQUE("slug")
);

ALTER TABLE "report_templates"
  ADD CONSTRAINT "report_templates_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "report_templates"
  ADD CONSTRAINT "report_templates_updated_by_user_id_users_id_fk"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "report_templates_view_scope_idx"
  ON "report_templates" USING btree ("view_type", "scope_type", "scope_reference_id", "scope_key");
