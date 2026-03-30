CREATE TYPE "public"."notification_event_type" AS ENUM(
  'STALE_BASELINE',
  'FAILED_EXTRACTION',
  'DISPLAY_STALE_HEARTBEAT'
);
--> statement-breakpoint
CREATE TYPE "public"."display_alert_status" AS ENUM('ACTIVE', 'RESOLVED');
--> statement-breakpoint
CREATE TYPE "public"."display_alert_type" AS ENUM('STALE_HEARTBEAT');
--> statement-breakpoint
CREATE TYPE "public"."cleanup_status" AS ENUM('ACTIVE', 'EXPIRED', 'DELETED', 'FAILED');
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
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "notification_preferences_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_unique_idx"
  ON "notification_preferences" USING btree ("user_id","event_type","channel");
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
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_escalation_policies_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action,
  CONSTRAINT "notification_escalation_policies_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_escalation_policies_unique_idx"
  ON "notification_escalation_policies" USING btree ("event_type","channel","role_slug","escalation_order");
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
  "metadata" jsonb,
  CONSTRAINT "display_alerts_playlist_id_display_playlists_id_fk"
    FOREIGN KEY ("playlist_id") REFERENCES "public"."display_playlists"("id")
    ON DELETE set null ON UPDATE no action,
  CONSTRAINT "display_alerts_screen_heartbeat_id_display_screen_heartbeats_id_fk"
    FOREIGN KEY ("screen_heartbeat_id") REFERENCES "public"."display_screen_heartbeats"("id")
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "display_alerts_unique_idx"
  ON "display_alerts" USING btree ("screen_heartbeat_id","alert_type");
--> statement-breakpoint
ALTER TABLE "notification_deliveries"
  ADD COLUMN "event_type" "notification_event_type",
  ADD COLUMN "display_alert_id" uuid;
--> statement-breakpoint
UPDATE "notification_deliveries"
SET "event_type" = (
  SELECT CASE
    WHEN r."notification_type" = 'STALE_BASELINE' THEN 'STALE_BASELINE'::"notification_event_type"
    WHEN r."notification_type" = 'FAILED_EXTRACTION' THEN 'FAILED_EXTRACTION'::"notification_event_type"
  END
  FROM "release_readiness_notifications" r
  WHERE r."id" = "notification_deliveries"."readiness_notification_id"
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries"
  ALTER COLUMN "readiness_notification_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notification_deliveries"
  ALTER COLUMN "event_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_display_alert_id_display_alerts_id_fk"
  FOREIGN KEY ("display_alert_id") REFERENCES "public"."display_alerts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "notification_deliveries_unique_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_unique_idx"
  ON "notification_deliveries" USING btree ("event_type","channel","recipient","readiness_notification_id","display_alert_id");
--> statement-breakpoint
ALTER TABLE "report_export_deliveries"
  ADD COLUMN "retention_days" integer DEFAULT 30 NOT NULL,
  ADD COLUMN "expires_at" timestamp with time zone,
  ADD COLUMN "cleanup_status" "cleanup_status" DEFAULT 'ACTIVE' NOT NULL,
  ADD COLUMN "cleaned_up_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "report_export_artifacts"
  ADD COLUMN "retention_days" integer DEFAULT 30 NOT NULL,
  ADD COLUMN "expires_at" timestamp with time zone,
  ADD COLUMN "cleanup_status" "cleanup_status" DEFAULT 'ACTIVE' NOT NULL,
  ADD COLUMN "cleaned_up_at" timestamp with time zone;
