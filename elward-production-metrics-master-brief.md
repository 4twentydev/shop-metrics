# Master Brief — Elward Production Metrics Platform

Use this as the **single source of truth** for Claude, Codex, or any other coding agent working on the project.

---

## 1. Project Overview

Build a **production-grade web app** for Elward Systems that captures shop-floor work with minimal friction, uses uploaded job documents plus Gemini-assisted extraction to create approved release baselines, and generates operational metrics, dashboards, and configurable reports.

The system must be designed for real daily use in a manufacturing environment, not as a generic CRUD dashboard.

The app has **two primary surfaces**:

### A. Shop Entry Surface
Used by employees and leads to log work quickly, verify it, and close out shifts.

### B. Operations Intelligence Surface
Used by admin/operations to manage jobs, releases, uploaded documents, extraction review, approved baselines, metrics, reporting, and exports.

The business is fundamentally **panel-centric**.  
Even when departments log different native work units, the app must normalize those units into **panel-equivalent metrics**.

---

## 2. Tech Stack

Use the latest stable releases and verify implementation details with **Context7 first**, then official docs.

### Required stack
- Next.js with **App Router**
- TypeScript
- Tailwind CSS
- Motion
- Neon Postgres
- Drizzle ORM + Drizzle Kit
- GitHub
- Vercel

### Storage
Use a production-ready object/file storage solution suitable for uploaded PDFs and document sets.  
Do **not** use local production file storage.

### AI
Use **Gemini** only for controlled extraction workflows.  
AI output is assistive only and must never become approved truth automatically.

---

## 3. Authentication and Access

Authentication should be **secure but effortless**.

### Requirements
- No email/password accounts
- No username/password accounts for normal usage
- Simple sign-in flow suitable for shop-floor employees on phones
- Secure session management
- Role-aware access control from the start

### Recommended auth approach
Use one of these approaches, in this order of preference:

1. **Passkeys** for supported users/devices
2. **Magic-link email sign-in** as fallback if needed
3. **Admin-created quick access / invite-based onboarding** if that simplifies rollout

### Practical direction
- Employees should not need to remember passwords
- Logging in should feel nearly frictionless
- Session persistence should reduce repeated sign-ins on personal devices
- Shared device support should still be possible without weakening security
- Role assignment must be controlled by admin, not self-selected by the user

### Access model
Support at minimum:
- Admin / operations
- Lead
- Standard employee
- Read-only / report viewer if needed later

---

## 4. Non-Negotiable Engineering Rules

### Framework / architecture rules
- Use **Next.js App Router only**
- Use **server components by default**
- Use **client components only when needed for interaction**
- Use strict TypeScript
- Use explicit validation schemas at all input boundaries
- Keep business logic out of page components
- Centralize:
  - permissions
  - metric formulas
  - status transitions
  - date/business-day rules
  - extraction normalization logic

### Forbidden choices
- No Pages Router
- No Prisma
- No Supabase
- No deprecated patterns
- No mock-only architecture pretending to be production-ready
- No AI-generated schema guessing without domain alignment

### Workflow rules for coding agents
- Work in **manageable vertical slices**
- At the start of each task, restate the exact scope
- Do not modify unrelated files
- Prefer complete, testable chunks over sprawling partial work
- After coding, always summarize:
  1. files created/changed
  2. what was implemented
  3. what remains
  4. exact next recommended chunk

---

## 5. Product Goals

The system must support four main outcomes:

### 1. Low-friction work recording
Employees in multiple departments must be able to quickly record output with minimal effort, especially on phones.

### 2. Job/release baseline creation
Admin uploads PDFs and related documents for jobs/releases. Gemini helps extract structured production expectations from those files.

### 3. Metrics and analysis
The system compares approved baselines with actual recorded work to produce useful production metrics.

### 4. Reporting
The system generates daily, weekly, monthly, and annual reports, plus exports for review in Excel and other formats.

---

## 6. Departments in Scope

Initial departments:

- CNC
- Elumatics
- Parts Prep
- Panel Prep
- Assembly
- Shipping

The app should be designed to allow additional departments later without major schema redesign.

---

## 7. Core Business Reality

At Elward, the business sells **panels**, even though upstream work may be recorded in different units.

That means the app must support:

- **native department unit**
- **normalized panel-equivalent output**

Examples:
- CNC logs layouts
- Elumatics logs parts
- Parts Prep / Panel Prep log parts or related prep units
- Assembly logs panels
- Shipping logs panels

All must normalize into panel-equivalent production metrics.

---

## 8. Core Workflow Definitions

## Employee workflow
- Employees log the **minimum necessary** data
- Employees can keep **adding to the same job/release during a shift**
- The app should optimize for the fastest possible repeated entry workflow
- Recurring constant details should be defaulted wherever possible

## Lead workflow
- Leads can **verify throughout the day**
- Leads can view **cross-department totals and metrics at lead level**
- Leads do not need unnecessary granular drilldowns into other leads’ detailed team records
- Leads perform **Submit All** at the end of each shift

## End-of-shift rules
- End-of-shift `Submit All` locks related records
- Locked records can only be changed by reopening
- Reopen actions must be logged in the audit trail

## Edit rules
- Employees can submit edits
- Leads can submit edits
- All edits must be versioned and explicitly marked as edits
- Edit history must remain visible/auditable

---

## 9. Native Work Units by Department

These are the starting definitions.

### CNC
- Native unit: **layout**
- Layouts contain panel composition and a layout quantity multiplier
- The number of panels represented by a layout can vary

### Elumatics
- Native unit: **job / release / part ID / quantity**
- Panel equivalent may be derived from extracted data and manually overridden if needed

### Parts Prep / Panel Prep
- Works similarly to Elumatics for now
- Exact final UI may vary, but schema should support parts and panel-equivalent normalization

### Assembly
- Native unit: **panel**

### Shipping
- Native unit: **panel**

---

## 10. Rework Requirements

Rework must be treated as a **first-class object**, not a note or checkbox.

Rework must be supported at **all stations/departments**.

Each rework record should preserve:
- quantity affected
- where the fault originated, if known
- where the rework was discovered
- where the fix was performed
- whether the issue was:
  - self-caused
  - caused upstream
- rework category/reason
- notes/comments

### Rework metric rules
- Rework must count separately for fault attribution
- Rework must still count as output for the department fixing it
- Rework must remain explicitly marked in metrics and reports
- Installer-fault remakes and internal-fault remakes must be handled differently in metrics

---

## 11. Job / Release Conventions

### Job numbers
- Job numbers are **5 digits**
- The first two digits represent the year

### Release types
Support these release patterns:

- `R#`
- `RMK#`
- `RME#`
- `A#`

Definitions:
- `R#` = standard release
- `RMK#` = remake where installer is at fault, starting at 51
- `RME#` = remake where internal/shop fault is at issue, starting at 51
- `A#` = accessory releases

The system should support these cleanly in schema, filtering, metrics, and reporting.

---

## 12. Document Upload + Extraction Workflow

A release may have **multiple related documents** that collectively contain the information needed to establish a baseline.

Examples may include:
- shop drawings
- cutsheets
- accessory lists
- material-related documents
- revision-related documents
- other release-specific PDF sources

### Upload / grouping rules
- Multiple documents can be uploaded for the same release
- Documents must be grouped at the release level
- Revision history must be preserved

### Revision rules
Revised documents should **supersede prior versions** when they are inclusive and not merely obvious add-ons.

This supersede decision must remain reviewable and human-controlled.

### Baseline rules
- Approved baselines are **per release**
- Revised uploads should automatically flag potentially stale baselines
- AI output never becomes baseline truth automatically
- Baselines require human review and approval

---

## 13. Gemini Extraction Requirements

Gemini should extract everything relevant to the platform’s goals from the uploaded release document set.

The review UI is **summary-oriented**, not page-by-page line editing for Phase 1.

### Extraction output expectations
The system should support extraction and review of:
- expected panels
- release totals
- material totals
- part totals
- accessory totals
- due dates
- revision notes
- any other relevant summary data needed for metrics or operations

### Extraction workflow rules
- Store raw AI output
- Store normalized output
- Store confidence and processing status
- Allow manual edits before approval
- Allow updates over time
- Revised document uploads should trigger stale-baseline review
- One approved baseline exists **per release version state**

---

## 14. Metrics Requirements

The business is primarily trying to measure:

- panels being cut
- panels being routed
- panels being prepped
- panels being built
- panels being shipped

Metrics should work at:
- employee level
- department level
- job level
- release level
- company-wide level

### Completion
Completion should support percentage views by:
- job
- release
- part family

Percentages should use the appropriate denominator from approved baseline data or explicitly defined manual logic.

### Targets
Targets are:
- manually entered
- department-specific
- employee-specific

### Rework metrics
Metrics must distinguish:
- standard output
- rework output
- internal-fault remakes
- installer-fault remakes
- zone at fault
- zone fixing the issue

### Accountability metrics
The platform should support:
- edited entries
- reopened shifts/days
- unverified entries
- late submissions
- missing baseline mappings
- stale baseline impact

### Gap / bottleneck metrics
The platform should support analysis such as:
- cut vs route gap
- route vs prep gap
- prep vs assembly gap
- assembly vs shipping gap
- stuck releases
- inactive jobs
- likely bottleneck zones

---

## 15. Reporting Requirements

Reports must support:
- daily
- weekly
- monthly
- annual

Reports should be **configurable**, not hardcoded-only.

### Intended use
Reports are primarily:
- operational
- accountability-focused

### Required outputs
Support:
- web view
- Excel export
- CSV export
- PDF export

### Excel expectations
Exports for management should support:
- raw detail tabs
- summary tabs
- pivot-ready tabs

---

## 16. Permissions and Visibility

### Admin / operations
Can:
- upload/review/approve baselines
- manage jobs/releases/documents
- manage targets
- view detailed metrics
- configure reports
- export reports
- comment anywhere appropriate

### Leads
Can:
- verify entries during the shift
- submit all at shift end
- comment/annotate
- view cross-department totals and metrics at lead level
- reopen locked records where permitted and logged

### Base users / employees
Should generally:
- see their own relevant entry screens
- log work quickly
- submit edits where allowed
- have restricted visibility relative to leads/admin
- not see broad cross-department accountability data

---

## 17. Device and Usage Constraints

The app must support:
- phones
- tablets
- desktops
- potentially shared shop terminals

Primary assumption:
- many employees will use phones

### Offline handling
Network reliability is generally acceptable, but offline capability or offline-tolerant behavior should be treated as important and planned for.

Do not overbuild offline-first complexity immediately, but do not architect the app in a way that makes offline support impossible later.

---

## 18. UX Priorities

### Employee UX
This is the most important UX in the app.

Rules:
- fastest possible entry
- minimum fields
- repeated same-job/release entry should be easy
- auto-fill recurring details
- station derived from logged-in user assignment
- mobile-first tap targets
- avoid dense table-heavy forms
- optional rework section should stay out of the way unless needed

### Lead UX
Leads need:
- verification visibility
- end-of-shift submission workflow
- summary metrics
- comments/notes
- controlled reopen capability

### Admin/ops UX
Needs:
- upload/review/approve flows
- stale baseline alerts
- detailed metrics drilldowns
- configurable reporting
- export controls
- targets management
- comments/annotations throughout

### Shared display screens
This is intentionally not finalized yet.  
Architect for it later, but do not block current work on unresolved display-mode specifics.

---

## 19. UI Style Guide

### Product character
The UI should feel:
- industrial
- efficient
- calm
- precise
- modern
- trustworthy

### Visual rules
- dark-first
- high contrast
- clear hierarchy
- restrained accent usage
- semantic colors for status only
- tabular numerals for metrics

### Layout rules
- entry pages should be narrow and focused
- admin pages can be denser, but never cluttered
- filters should stay visible on dashboard/report pages
- use drawers/sheets/detail panels when useful
- optimize for scanability and speed

### Motion rules
Motion should be used only where it improves usability:
- confirmations
- expand/collapse
- route/detail transitions
- sheets/modals
- subtle dashboard reveal

Do not over-animate.

---

## 20. Recommended Domain Model

The implementation should likely include entities in this direction.

### Org / access
- users
- employees
- roles
- departments
- stations
- employee_station_assignments
- shifts

### Jobs / releases
- jobs
- job_releases
- job_release_types
- job_release_targets
- job_documents
- job_document_groups
- job_document_revisions
- job_release_baselines
- job_release_baseline_versions

### Extraction
- extraction_runs
- extraction_run_documents
- extraction_raw_outputs
- extraction_normalized_outputs
- extraction_review_sessions
- extraction_field_overrides
- baseline_staleness_flags

### Work logging
- work_sessions
- work_entries
- work_entry_versions
- work_entry_comments
- shift_submissions
- shift_submission_items
- reopen_events

### Rework
- rework_events
- rework_categories
- rework_fault_zones
- rework_resolution_entries

### Metrics
- metric_definitions
- metric_targets
- metric_snapshot_daily
- metric_snapshot_weekly
- metric_snapshot_monthly
- metric_snapshot_annual

### Reporting
- report_templates
- report_runs
- report_run_sections
- report_exports

### Audit
- audit_logs

This does not need to be copied literally if the coding agent has a stronger normalized design, but the business concepts must be preserved.

---

## 21. Recommended Build Order

The project should be built in this order.

### Phase 1 — Foundation
- repo setup
- app shell
- env validation
- Neon + Drizzle
- auth scaffolding
- role scaffolding
- audit scaffolding
- seed data
- base layouts for employee and ops surfaces

### Phase 2 — Work Entry Vertical Slice
- employee entry flows by department
- shift-aware work session model
- lead verification
- submit-all end-of-shift lock flow
- edit/version tracking
- rework capture

### Phase 3 — Job / Release Intake
- jobs and releases
- document grouping
- revision handling
- stale baseline flagging scaffolding
- upload and review UI

### Phase 4 — Gemini Extraction + Baseline Approval
- document-set extraction
- raw + normalized output storage
- review/edit UI
- release-level approval flow
- stale baseline re-review flow

### Phase 5 — Metrics Engine
- panel-equivalent normalization logic
- target logic
- progress logic
- rework logic
- snapshot generation
- tested formulas

### Phase 6 — Dashboards + Reports
- department/job/release/employee/company views
- report builder/configuration
- exports
- accountability and bottleneck views

Do not start with dashboards before Phases 1–4 are structurally correct.

---

## 22. Recommended Folder Structure

A feature-first structure is preferred.

```text
src/
  app/
    (employee)/
    (ops)/
    api/
  components/
    ui/
    shared/
  features/
    auth/
    employees/
    departments/
    stations/
    shifts/
    jobs/
    releases/
    documents/
    extraction/
    baselines/
    work-entries/
    rework/
    metrics/
    reports/
    audit/
    permissions/
  db/
    schema/
    migrations/
    seeds/
  lib/
    db/
    ai/
    storage/
    validation/
    permissions/
    dates/
    formatting/
```

Avoid a chaotic folder structure where pages contain hidden business logic.

---

## 23. Master Instruction Block for Coding Agents

Paste this at the top of implementation prompts.

```text
Build a production-quality panel-centric manufacturing metrics platform for Elward Systems.

Required stack:
- Next.js latest stable with App Router
- TypeScript strict mode
- Tailwind CSS latest stable
- Motion latest stable
- Neon Postgres
- Drizzle ORM + Drizzle Kit
- GitHub
- Vercel

Authentication rules:
- authentication must be secure but effortless
- do not use email/password accounts
- prefer passkeys where practical
- support a simple fallback such as magic links if needed
- keep role assignment admin-controlled

Documentation rules:
- Use Context7 first for all framework/library decisions.
- Then verify against official docs.
- Use current stable APIs only.
- Do not use deprecated or legacy patterns.

Architecture rules:
- App Router only
- server components by default
- client components only where interaction requires them
- keep business logic out of page files
- validate all input with explicit schemas
- centralize permissions, status transitions, metric formulas, date/business-day logic, and extraction normalization
- add audit logging for important mutations
- design for maintainability, traceability, and production readiness

Domain rules:
- panel output is the canonical business metric
- departments log native units that normalize into panel-equivalent output
- employees can append to the same job/release during a shift
- leads can verify throughout the day
- leads perform submit-all at end of shift
- submit-all locks records unless reopened, and reopen actions must be logged
- rework is a first-class object with fault attribution and fixing-zone attribution
- baselines are approved per release
- revised uploads should flag stale baselines
- AI extraction is assistive only and must never auto-approve into source-of-truth data
- targets are manually entered
- reporting must support daily, weekly, monthly, and annual summaries
- exports must support web, Excel, CSV, and PDF use cases

Workflow rules:
- work in manageable vertical slices
- restate exact scope before coding
- do not modify unrelated files
- after coding, summarize:
  1. files changed
  2. what was implemented
  3. what remains
  4. exact next recommended chunk
```

---

## 24. Prompt Set for Build Phases

## Prompt 1 — Foundation

```text
Use Context7 and official docs first.

Create the production foundation for a panel-centric manufacturing metrics platform.

Implement:
- Next.js latest stable with App Router
- strict TypeScript
- Tailwind CSS latest stable
- Motion latest stable
- Neon + Drizzle + Drizzle Kit
- environment variable validation
- production-safe file storage abstraction for PDF uploads
- secure but effortless auth scaffolding with no email/password accounts
- base app shell
- role scaffolding
- audit log table
- feature-based folder structure
- seed script
- admin/ops surface shell
- employee surface shell
- README with local dev and deployment instructions

Initial schema should include:
- users
- employees
- roles
- departments
- stations
- employee_station_assignments
- shifts
- jobs
- job_releases
- job_documents
- audit_logs

Constraints:
- App Router only
- no Prisma
- no Pages Router
- no deprecated APIs
- no fake mock architecture

Return:
- schema
- migrations
- seed data
- folder structure
- architecture notes
- exact next recommended chunk
```

## Prompt 2 — Work Entry Vertical Slice

```text
Use Context7 first.

Build the employee and lead work-entry system as a production vertical slice.

Departments:
- CNC
- Elumatics
- Parts Prep
- Panel Prep
- Assembly
- Shipping

Business rules:
- employees can append entries to the same job/release during a shift
- leads can verify throughout the day
- submit-all happens at end of shift
- submit-all locks records unless reopened
- reopening must be logged
- employees enter minimum necessary data only
- station derives from employee assignment
- rework must be supported at all stations
- employees and leads can edit, but edits must be versioned and marked
- leads can comment and verify
- leads can see cross-department totals/metrics at lead level only

Data requirements:
- native unit type
- native quantity
- panel-equivalent quantity
- business date
- shift
- verification status
- lock status
- version history
- rework attribution fields

Deliver:
- routes
- forms
- actions
- validation schemas
- seed data
- audit logging
- extension notes for future departments
```

## Prompt 3 — Release Intake + Revision Handling

```text
Use Context7 first.

Build the release intake and document revision system.

Requirements:
- support 5-digit job numbers
- support release types R#, RMK#, RME#, and A#
- upload multiple related documents for a release
- group documents by release
- preserve revision history
- allow manual supersede decisions
- flag stale baselines when revised uploads affect approved releases
- allow notes/comments by leads/admins
- prepare clean handoff to extraction workflows

Deliver:
- schema additions
- upload flow
- revision grouping logic
- stale baseline flagging model
- admin review UI
- seed/demo data
- exact next step recommendation
```

## Prompt 4 — Gemini Extraction + Baseline Approval

```text
Use Context7 first.

Build a controlled Gemini extraction workflow for release document sets.

Requirements:
- Gemini abstraction layer
- strict structured JSON output
- support combining multiple documents into one release-level extraction
- persist raw output, normalized output, confidence, and processing status
- create a summary-based review UI
- editable extracted fields
- approved baseline per release
- revised uploads trigger stale baseline review
- never auto-approve AI output

Review fields should support:
- expected panels
- release totals
- material totals
- part totals
- accessory totals
- due dates
- revision notes
- additional relevant editable summary fields

Deliver:
- schema additions if needed
- extraction services
- review UI
- approval flow
- retry/failure handling
- notes for document-type-specific extractor extensions
```

## Prompt 5 — Metrics Engine

```text
Use Context7 first.

Build the metrics engine for a panel-centric production system.

Requirements:
- metric logic must be separate from UI
- normalize native department work into panel-equivalent metrics
- support daily, weekly, monthly, annual windows
- support employee, department, job, release, and company scopes
- support completion percentages by job, release, and part family
- support manually entered targets
- support rework metrics with fault-zone and fixing-zone attribution
- distinguish internal-fault remakes vs installer-fault remakes
- support accountability metrics such as edited entries, unverified entries, reopen events, missing mappings, and stale baseline impact
- use snapshot-based reporting strategy
- unit test formulas

Deliver:
- calculation services
- tests
- snapshot jobs
- example queries
- performance notes
```

## Prompt 6 — Dashboards + Configurable Reports

```text
Use Context7 first.

Build dashboards and configurable reporting for the manufacturing metrics platform.

Requirements:
- executive overview
- department drilldown
- employee drilldown
- job/release drilldown
- accountability views
- rework views
- bottleneck/gap views
- configurable report templates
- daily/weekly/monthly/annual report generation
- export support for Excel, CSV, PDF, and web view
- raw detail tabs, summary tabs, and pivot-ready export structures
- mobile-usable and desktop-optimized
- restrained Motion only

Deliver:
- routes
- components
- report generation services
- export handling
- notes for future display-screen mode
```

---

## 25. Open Items That Do Not Block Phase 1

These can remain unresolved for now:

- final shared-display / shop-monitor mode
- whether shared displays should show team-level only or more detail
- exact extraction schemas by document type
- exact long-term Panel Prep input pattern if it diverges from current assumptions
- barcode/QR workflow timing, since that is later-phase

These should not block foundation, entry, intake, or extraction scaffolding.

---

## 26. Final Build Direction

The app should be treated as **operations software with strong auditability**, not a flashy dashboard project.

The highest-risk area is not charts.  
It is the correctness of:

- entry workflow
- release/baseline model
- panel-equivalent normalization
- rework modeling
- shift lock/reopen rules
- metrics formulas

If those are right, the dashboards will be meaningful.  
If those are wrong, the rest of the app is decoration.

---

## 27. Recommended Immediate Next Step

Start with:

1. **Foundation**
2. **Work Entry Vertical Slice**

That is the correct sequence.

After that:
3. Release intake
4. Extraction review
5. Metrics engine
6. Dashboards and reports
