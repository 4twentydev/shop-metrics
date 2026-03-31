DROP TABLE IF EXISTS "passkeys";--> statement-breakpoint
DROP TABLE IF EXISTS "verifications";--> statement-breakpoint
DROP TABLE IF EXISTS "accounts";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "image";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "active_organization_id";
