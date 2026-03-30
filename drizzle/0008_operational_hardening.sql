ALTER TABLE "release_extraction_runs"
  ADD COLUMN "processing_metadata" jsonb;

ALTER TABLE "metric_targets"
  ADD COLUMN "deleted_at" timestamp with time zone,
  ADD COLUMN "deleted_by_user_id" text,
  ADD COLUMN "deletion_reason" text;

ALTER TABLE "metric_targets"
  ADD CONSTRAINT "metric_targets_deleted_by_user_id_users_id_fk"
  FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "report_templates"
  ADD COLUMN "deleted_at" timestamp with time zone,
  ADD COLUMN "deleted_by_user_id" text,
  ADD COLUMN "deletion_reason" text;

ALTER TABLE "report_templates"
  ADD CONSTRAINT "report_templates_deleted_by_user_id_users_id_fk"
  FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TYPE "config_change_action" AS ENUM ('CREATED', 'UPDATED', 'SOFT_DELETED', 'RESTORED');
CREATE TYPE "readiness_notification_status" AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE "readiness_notification_type" AS ENUM ('STALE_BASELINE', 'FAILED_EXTRACTION');

CREATE TABLE "metric_target_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "metric_target_id" uuid NOT NULL,
  "change_action" "config_change_action" NOT NULL,
  "snapshot" jsonb NOT NULL,
  "changed_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "metric_target_versions"
  ADD CONSTRAINT "metric_target_versions_metric_target_id_metric_targets_id_fk"
  FOREIGN KEY ("metric_target_id") REFERENCES "metric_targets"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "metric_target_versions"
  ADD CONSTRAINT "metric_target_versions_changed_by_user_id_users_id_fk"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "metric_target_versions_target_idx"
  ON "metric_target_versions" USING btree ("metric_target_id","created_at");

CREATE TABLE "report_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_template_id" uuid NOT NULL,
  "change_action" "config_change_action" NOT NULL,
  "snapshot" jsonb NOT NULL,
  "changed_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "report_template_versions"
  ADD CONSTRAINT "report_template_versions_report_template_id_report_templates_id_fk"
  FOREIGN KEY ("report_template_id") REFERENCES "report_templates"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "report_template_versions"
  ADD CONSTRAINT "report_template_versions_changed_by_user_id_users_id_fk"
  FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "report_template_versions_template_idx"
  ON "report_template_versions" USING btree ("report_template_id","created_at");

CREATE TABLE "display_playlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "rotation_seconds" integer DEFAULT 20 NOT NULL,
  "heartbeat_interval_seconds" integer DEFAULT 60 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_user_id" text NOT NULL,
  "updated_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "display_playlists_slug_unique" UNIQUE("slug")
);
ALTER TABLE "display_playlists"
  ADD CONSTRAINT "display_playlists_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "display_playlists"
  ADD CONSTRAINT "display_playlists_updated_by_user_id_users_id_fk"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "display_playlists_active_idx"
  ON "display_playlists" USING btree ("is_active","slug");

CREATE TABLE "display_playlist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "playlist_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "display_playlist_items"
  ADD CONSTRAINT "display_playlist_items_playlist_id_display_playlists_id_fk"
  FOREIGN KEY ("playlist_id") REFERENCES "display_playlists"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "display_playlist_items"
  ADD CONSTRAINT "display_playlist_items_template_id_report_templates_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "report_templates"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE UNIQUE INDEX "display_playlist_items_unique_idx"
  ON "display_playlist_items" USING btree ("playlist_id","template_id");
CREATE UNIQUE INDEX "display_playlist_items_position_idx"
  ON "display_playlist_items" USING btree ("playlist_id","position");

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
ALTER TABLE "display_screen_heartbeats"
  ADD CONSTRAINT "display_screen_heartbeats_playlist_id_display_playlists_id_fk"
  FOREIGN KEY ("playlist_id") REFERENCES "display_playlists"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "display_screen_heartbeats_last_seen_idx"
  ON "display_screen_heartbeats" USING btree ("last_seen_at");

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
ALTER TABLE "release_readiness_notifications"
  ADD CONSTRAINT "release_readiness_notifications_job_release_id_job_releases_id_fk"
  FOREIGN KEY ("job_release_id") REFERENCES "job_releases"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE UNIQUE INDEX "release_readiness_notifications_unique_idx"
  ON "release_readiness_notifications" USING btree ("job_release_id","notification_type");
CREATE INDEX "release_readiness_notifications_status_idx"
  ON "release_readiness_notifications" USING btree ("status","detected_at");
