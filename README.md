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

## Architecture notes

- Server components are the default. Client components are only used for interactive auth controls.
- Business concerns that should not live in page files already have centralized modules:
  - permissions: [`lib/auth/permissions.ts`](./lib/auth/permissions.ts)
  - release transitions: [`features/releases/status.ts`](./features/releases/status.ts)
  - panel-equivalent formulas: [`features/metrics/formulas.ts`](./features/metrics/formulas.ts)
  - business-day helpers: [`features/time/business-day.ts`](./features/time/business-day.ts)
  - extraction normalization: [`features/extraction/normalization.ts`](./features/extraction/normalization.ts)
- Better Auth is configured without email/password accounts. Users are expected to be provisioned by admins, then sign in by passkey or magic link.
- The initial schema is intentionally operationally focused: users, employees, roles, departments, stations, assignments, shifts, jobs, releases, documents, audit logs, plus the auth support tables Better Auth requires.
- PDF upload handling is abstracted behind a storage interface so document ingestion can be implemented without binding page logic to a single storage provider.

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
  releases/
  time/
lib/
  audit/
  auth/
  db/
    schema/
  storage/
drizzle/
scripts/
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
5. Run `npm run db:migrate` against the production database before first use.
6. Redeploy after the environment variables are saved.

## Database deliverables in this chunk

- Drizzle schema: [`lib/db/schema`](./lib/db/schema)
- SQL migration: [`drizzle/0000_foundation.sql`](./drizzle/0000_foundation.sql)
- Seed script: [`scripts/seed.ts`](./scripts/seed.ts)

## Auth notes

- Primary sign-in path: passkeys
- Fallback: magic links
- Disabled: email/password
- Role assignment: admin-controlled via seeded roles and the user `activeRole` field

## Next recommended chunk

Implement the first true operational vertical slice:

- shift work-entry records
- lead verification during the shift
- submit-all locking and reopen audit logging
- release-aware native-unit normalization into panel-equivalent output
