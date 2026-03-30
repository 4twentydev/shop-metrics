# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev           # Start Next.js dev server

# Build & type checking
npm run build         # Production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit (strict)

# Database
npm run db:generate   # Generate Drizzle migrations from schema changes
npm run db:migrate    # Apply migrations to the database
npm run db:studio     # Open Drizzle Studio GUI
npm run db:seed       # Seed the database (tsx scripts/seed.ts)

# Tests (Node.js native test runner — no Jest/Vitest)
tsx --test tests/metrics/formulas.test.ts   # Run a single test file
tsx --test tests/**/*.test.ts               # Run all tests
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Drizzle ORM · PostgreSQL · Tailwind CSS v4 · Better Auth · Zod v4

### Folder structure

- `app/` — Next.js routes. Route groups: `(auth)` (sign-in), `(marketing)` (public landing), `(platform)` (all protected pages under `/ops` and `/employee`), `display` (token-gated public kiosk routes). API routes under `app/api/`.
- `features/` — Domain business logic grouped by feature: `auth`, `extraction`, `governance`, `metrics`, `release-intake`, `releases`, `reporting`, `time`, `work-entries`. Each module contains server actions, queries, Zod schemas, and `components/` sub-folders.
- `lib/` — Shared infrastructure: `auth/` (Better Auth config + permissions), `db/` (Drizzle client + schema), `ai/` (Gemini wrapper), `audit/`, `storage/`, `env.ts`.
- `drizzle/` — SQL migration files (11 sequential migrations, never hand-edit).
- `tests/` — Unit tests using `node:test` + `node:assert/strict`.
- `scripts/` — One-off scripts run with `tsx` (e.g. `seed.ts`).

### Key architectural patterns

- **Server components first.** Client components are used only for interactive auth UI.
- **Feature modules own their DB queries.** Prefer calling `features/<domain>/queries.ts` or `features/<domain>/actions.ts` rather than writing raw Drizzle queries in route files.
- **Single permissions source of truth** at `lib/auth/permissions.ts`. Roles: Admin, Ops, Lead, Employee.
- **Storage abstraction** in `lib/storage/`: `local` driver for dev, `vercel-blob` for production. Never import `@vercel/blob` directly.
- **Audit logging** via helpers in `lib/audit/` — call these for any state-mutating operations.
- **Snapshot-based metrics** — the metrics engine (`features/metrics/`) computes aggregates on demand and stores them as snapshots; targets are compared at read time.
- **Environment validation** via Zod schema in `lib/env.ts` (server-only). Add new env vars there. Production enforces `STORAGE_DRIVER=vercel-blob` and requires `RESEND_API_KEY`.
- **Typed routes** are enabled (`typedRoutes: true` in `next.config.ts`) — use `href` values that satisfy the route type.

### Database schema

Schema source of truth is `lib/db/schema/` (primarily `operations.ts`, ~40 KB). After editing schema, run `db:generate` then `db:migrate`. Do not manually edit files in `drizzle/`.

### Authentication

Passkey-first with magic-link fallback via Better Auth. No username/password. Auth tables are managed by Better Auth and defined in `lib/db/schema/auth.ts`.

### Centralized business logic

Do not reimplement these — call them directly:

- `lib/auth/permissions.ts` — role/permission checks
- `features/releases/status.ts` — release state transitions
- `features/metrics/formulas.ts` — panel-equivalent output formulas (tested)
- `features/metrics/engine.ts` — snapshot computation and aggregation
- `features/time/business-day.ts` — business-day helpers
- `features/extraction/normalization.ts` — AI extraction output normalization
- `lib/ai/gemini.ts` — Gemini wrapper (never call `@google/generative-ai` directly)

### AI / extraction

Gemini is used for release document extraction. Raw model output, normalized output, confidence, run status, and review status are all persisted. AI output is **never auto-approved** — reviewers must edit fields and explicitly approve. Bulk extraction actions are available from the extraction queue.

### Cron jobs

Six Vercel Cron endpoints live under `app/api/cron/`. They are secured with `CRON_SECRET`. The schedule is declared in `vercel.json`.

### Environment variables

Required (all environments): `APP_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_RP_ID`, `BETTER_AUTH_TRUSTED_ORIGIN`, `AUTH_FROM_EMAIL`

Conditional:
- `RESEND_API_KEY` — required in production for magic-link delivery
- `STORAGE_DRIVER` — `local` (dev) or `vercel-blob` (production)
- `BLOB_READ_WRITE_TOKEN` — required when `STORAGE_DRIVER=vercel-blob`
- `CRON_SECRET` — secures Vercel Cron routes
- `DISPLAY_ACCESS_TOKEN` — required to expose kiosk/display routes outside ops auth
- `GEMINI_API_KEY` / `GEMINI_MODEL` — required for AI extraction
