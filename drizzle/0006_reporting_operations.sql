CREATE TYPE "public"."report_delivery_status" AS ENUM('GENERATED', 'FAILED');
CREATE TYPE "public"."report_package_type" AS ENUM('SINGLE', 'BUNDLE');

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
  "byte_size" integer,
  "row_count" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "requested_by_user_id" text,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "report_export_deliveries"
  ADD CONSTRAINT "report_export_deliveries_template_id_report_templates_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "report_export_deliveries"
  ADD CONSTRAINT "report_export_deliveries_requested_by_user_id_users_id_fk"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "report_export_deliveries_window_idx"
  ON "report_export_deliveries" USING btree
  ("report_view", "window_type", "window_start", "scope_type", "scope_key");
