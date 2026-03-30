# Elward Systems Metrics

Production foundation for a panel-centric manufacturing metrics platform built on Next.js App Router, strict TypeScript, Tailwind CSS, Motion, Neon Postgres, Drizzle ORM, Better Auth, GitHub, and Vercel.

## What is included

- Next.js `16.2.1` with App Router only
- Strict TypeScript with tighter compiler checks
- Tailwind CSS `4` and Motion `12`
- Neon-compatible Postgres client using `postgres`
- Drizzle ORM schema, SQL migration, and seed script
- Better Auth scaffold with passkey-first auth and magic-link fallback
- Environment variable validation with `zod`
- Production-safe PDF storage abstraction:
  - local filesystem in development
  - Vercel Blob in production
- Audit log table and server-side audit helper
- Feature-oriented folder structure
- Admin/ops shell and employee shell
- Employee and lead work-entry vertical slice
- Release intake and document revision vertical slice
- Gemini extraction review vertical slice
- Snapshot-based metrics engine with targets and tested formulas
- Reporting dashboards, configurable templates, and multi-format exports
- Scheduled reporting operations, delivery history, and display-screen mode
- Bulk extraction review, scheduled display playlists, notification delivery logs, and export archives

## Architecture notes

- Server components are the default. Client components are only used for interactive auth controls.
- Business concerns that should not live in page files already have centralized modules:
  - permissions: [`lib/auth/permissions.ts`](./lib/auth/permissions.ts)
  - release transitions: [`features/releases/status.ts`](./features/releases/status.ts)
  - panel-equivalent formulas: [`features/metrics/formulas.ts`](./features/metrics/formulas.ts)
  - business-day helpers: [`features/time/business-day.ts`](./features/time/business-day.ts)
  - extraction normalization: [`features/extraction/normalization.ts`](./features/extraction/normalization.ts)
  - snapshot metrics engine: [`features/metrics/engine.ts`](./features/metrics/engine.ts)
- Better Auth is configured without email/password accounts. Users are expected to be provisioned by admins, then sign in by passkey or magic link.
- The initial schema is intentionally operationally focused: users, employees, roles, departments, stations, assignments, shifts, jobs, releases, documents, audit logs, plus the auth support tables Better Auth requires.
- PDF upload handling is abstracted behind a storage interface so document ingestion can be implemented without binding page logic to a single storage provider.
- Work-entry workflow is now centralized under `features/work-entries`, including:
  - assignment-derived station and shift resolution
  - submission locking and reopening
  - explicit input schemas
  - versioned entry history
  - lead comments and verification
- Reporting is snapshot-based:
  - raw operational rows are aggregated by window and scope into `metric_snapshots`
  - targets are stored separately in `metric_targets`
  - dashboard/reporting reads can prefer snapshots over live multi-join aggregation

## Folder structure

```text
app/
  (auth)/
  (marketing)/
  (platform)/
  api/auth/[...all]/
features/
  auth/components/
  extraction/
  metrics/
  reporting/
  releases/
  release-intake/
  time/
  work-entries/
lib/
  audit/
  auth/
  db/
    schema/
  storage/
drizzle/
scripts/
tests/
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values.

Required:

- `APP_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_RP_ID`
- `BETTER_AUTH_TRUSTED_ORIGIN`
- `AUTH_FROM_EMAIL`

Conditional:

- `RESEND_API_KEY`
  - required in production for magic-link delivery
- `STORAGE_DRIVER`
  - `local` for development
  - `vercel-blob` for production
- `BLOB_READ_WRITE_TOKEN`
  - required when `STORAGE_DRIVER=vercel-blob`
- `CRON_SECRET`
  - recommended in production to secure Vercel Cron routes
- `DISPLAY_ACCESS_TOKEN`
  - required if you want to expose the kiosk/display route outside ops auth

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Neon database or local Postgres database and set `DATABASE_URL`.

3. Create `.env.local` from `.env.example`.

4. Run the migration:

   ```bash
   npm run db:migrate
   ```

5. Seed the database:

   ```bash
   npm run db:seed
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

7. Run the metrics formula tests once Node/npm is running natively inside WSL:

   ```bash
   tsx --test tests/metrics/formulas.test.ts
   ```

## Vercel deployment

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Provision Neon and copy the pooled connection string to `DATABASE_URL`.
4. Set the rest of the environment variables in Vercel:
   - `APP_URL`
   - `BETTER_AUTH_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_RP_ID`
   - `BETTER_AUTH_TRUSTED_ORIGIN`
   - `AUTH_FROM_EMAIL`
   - `RESEND_API_KEY`
   - `STORAGE_DRIVER=vercel-blob`
   - `BLOB_READ_WRITE_TOKEN`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
5. Run `npm run db:migrate` against the production database before first use.
6. Redeploy after the environment variables are saved.

## Database deliverables in this chunk

- Drizzle schema: [`lib/db/schema`](./lib/db/schema)
- SQL migration: [`drizzle/0000_foundation.sql`](./drizzle/0000_foundation.sql)
- SQL migration: [`drizzle/0001_work_entry_vertical_slice.sql`](./drizzle/0001_work_entry_vertical_slice.sql)
- SQL migration: [`drizzle/0002_release_intake_documents.sql`](./drizzle/0002_release_intake_documents.sql)
- SQL migration: [`drizzle/0003_gemini_release_extraction.sql`](./drizzle/0003_gemini_release_extraction.sql)
- SQL migration: [`drizzle/0004_metrics_engine.sql`](./drizzle/0004_metrics_engine.sql)
- SQL migration: [`drizzle/0005_reporting_dashboards.sql`](./drizzle/0005_reporting_dashboards.sql)
- SQL migration: [`drizzle/0006_reporting_operations.sql`](./drizzle/0006_reporting_operations.sql)
- SQL migration: [`drizzle/0007_export_storage.sql`](./drizzle/0007_export_storage.sql)
- SQL migration: [`drizzle/0008_operational_hardening.sql`](./drizzle/0008_operational_hardening.sql)
- SQL migration: [`drizzle/0009_bulk_review_notifications_archives.sql`](./drizzle/0009_bulk_review_notifications_archives.sql)
- Seed script: [`scripts/seed.ts`](./scripts/seed.ts)

## Work-entry routes

- Employee route: `/employee/work-entry`
- Lead route: `/ops/work-entry`

## Release intake route

- Admin / lead route: `/ops/releases/intake`

## Extraction review route

- Admin / lead route: `/ops/releases/extraction`

## Release administration routes

- Release administration board: `/ops/releases/admin`
- Release administration detail: `/ops/releases/admin/[releaseId]`

## Reporting routes

- Executive overview: `/ops/reports`
- Reporting admin: `/ops/reports/admin`
- Display mode index: `/ops/reports/display`
- Display mode by template: `/ops/reports/display/[templateSlug]`
- Display playlist preview: `/ops/reports/display/playlists/[playlistSlug]`
- Public display index: `/display?access=DISPLAY_ACCESS_TOKEN`
- Public display by template: `/display/[templateSlug]?access=DISPLAY_ACCESS_TOKEN`
- Public display playlist: `/display/playlists/[playlistSlug]?access=DISPLAY_ACCESS_TOKEN`
- Public scheduled display resolver: `/display/schedule?access=DISPLAY_ACCESS_TOKEN&department=PNL&shift=DAY`
- Accountability: `/ops/reports/accountability`
- Rework: `/ops/reports/rework`
- Bottlenecks: `/ops/reports/bottlenecks`
- Department drilldown: `/ops/reports/departments/[departmentCode]`
- Employee drilldown: `/ops/reports/employees/[employeeCode]`
- Job drilldown: `/ops/reports/jobs/[jobNumber]`
- Release drilldown: `/ops/reports/releases/[releaseCode]`
- Exports: `/api/reports/export`
- Export bundles: `/api/reports/export/bundle`
- Stored export download: `/api/reports/download/[deliveryId]`
- Display heartbeat ingest: `/api/display/heartbeat`

## Release intake notes

- Jobs support 5-digit numbers in validation and seeded data.
- Release codes support `R#`, `RMK#`, `RME#`, and `A#`.
- Multiple related PDFs can be uploaded in one intake batch.
- Documents stay grouped under the release and preserve revision history by `documentFamily` plus `revisionNumber`.
- Supersede decisions are manual and review-driven.
- Baselines are flagged stale when approved releases receive baseline-affecting revised uploads.
- Review comments are stored at the release level and optionally tied to an intake batch.
- Intake batches move to `HANDOFF_READY` once pending supersede decisions are resolved, which creates a clean extraction handoff point.

## Gemini extraction notes

- Gemini is wrapped behind a server-side abstraction in [`lib/ai/gemini.ts`](./lib/ai/gemini.ts).
- Extraction runs persist raw model output, normalized structured output, edited reviewed output, confidence, run status, and review status.
- Extraction preprocessing now orders document families by kind and injects document-type-specific guidance before Gemini sees the release packet.
- Bulk extraction start and retry actions are available from the extraction queue for selected releases.
- Bulk approval and rejection actions are available from the extraction queue, with triaged failure reasons stored on extraction runs.
- Extraction combines the release's current document set into one release-level summary.
- AI output is never auto-approved. Reviewers edit fields first, then explicitly approve the baseline.
- Revised uploads can keep a release in stale-baseline review until a reviewed extraction run is approved.
- Document-type extension notes: [`features/extraction/extractor-extension-notes.md`](./features/extraction/extractor-extension-notes.md)

## Work-entry notes

- Employees append entries to the same job release during a shift.
- Station, department, shift, business date, native unit type, and panel normalization derive from the active assignment.
- Employee release availability now follows release-readiness rules, so stale-baseline and failed-extraction releases stay blocked from work-entry.
- Leads verify in-flight work, leave comments, and see cross-department totals only on the lead route.
- Active release-readiness notifications are surfaced on the lead work-entry route when stale baselines or failed extractions are blocking production.
- Readiness blockers can now send deduplicated email notifications to ops/admin roles, with delivery rows persisted for auditability.
- Submit-all locks the submission and all child entries.
- Reopen requires a reason and is written to the audit log.
- Entry edits are versioned and marked with editor and reason.
- Future department extension notes: [`features/work-entries/extension-notes.md`](./features/work-entries/extension-notes.md)

## Metrics engine notes

- Metric logic is UI-independent and centralized under [`features/metrics`](./features/metrics).
- Supported windows: `DAILY`, `WEEKLY`, `MONTHLY`, `ANNUAL`.
- Supported scopes: employee, department, job, release, company, and part family.
- Completion uses non-rework panel-equivalent output against approved release baselines.
- Accountability metrics include edited entries, unverified entries, reopen counts, missing normalization mappings, and stale baseline panel impact.
- Snapshot jobs live in [`features/metrics/snapshot-job.ts`](./features/metrics/snapshot-job.ts).
- Performance notes live in [`features/metrics/performance-notes.md`](./features/metrics/performance-notes.md).
- Formula coverage lives in [`tests/metrics/formulas.test.ts`](./tests/metrics/formulas.test.ts).

## Reporting notes

- Report generation is centralized under [`features/reporting`](./features/reporting).
- Saved templates are persisted in `report_templates` and support configurable summary/raw/pivot visibility.
- Metric targets and report templates now use recoverable soft deletes plus version tables for admin audit and rollback workflows.
- Export formats currently supported by the route handler are CSV, Excel-compatible SpreadsheetML XML, PDF, and web view.
- Export deliveries are logged to `report_export_deliveries` for admin history review.
- Historical export retrieval is supported when a delivery has a stored artifact and can be downloaded from the delivery history table.
- Scheduled reporting is wired through [`app/api/cron/reporting/route.ts`](./app/api/cron/reporting/route.ts) and [`vercel.json`](./vercel.json).
- Public display mode is token-gated through `DISPLAY_ACCESS_TOKEN`; ops-authenticated display routes remain available for internal review.
- Kiosk rotation playlists are stored in `display_playlists` and `display_playlist_items`, while live screen presence is tracked through `display_screen_heartbeats`.
- Dashboard views are mobile-usable, desktop-optimized, and use restrained Motion only for entrance and tab transitions.
- Future display-screen mode notes: [`features/reporting/display-mode-notes.md`](./features/reporting/display-mode-notes.md)

## Auth notes

- Primary sign-in path: passkeys
- Fallback: magic links
- Disabled: email/password
- Role assignment: admin-controlled via seeded roles and the user `activeRole` field

## Next recommended chunk

Implement the next operational hardening slice:

- extraction reviewer bulk approve/reject workflows with clearer failure triage
- kiosk-safe ops preview routes and playlist scheduling by shift or department
- notification delivery channels beyond in-app ops surfaces
- export bundle archives if historical multi-file packages must be re-downloaded intact
