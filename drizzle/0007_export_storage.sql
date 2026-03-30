ALTER TABLE "report_export_deliveries"
  ADD COLUMN "storage_provider" varchar(32),
  ADD COLUMN "storage_key" text,
  ADD COLUMN "storage_url" text;
