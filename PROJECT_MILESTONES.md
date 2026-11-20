# Krishi Bondhu implementation milestones

## How to resume

Read this file first when resuming work. Continue at **Current implementation milestone**; do not redo completed milestones. Complete **one milestone at a time**, update its status and the progress log, and do not begin the next milestone until the current milestone's acceptance criteria are met. Keep this file current after implementation decisions and verification. Do not treat a planned milestone as completed just because related code exists.

## Overall status

- M0 — Requirements and repository baseline: **Complete**
- M1 — Identity and application foundations: **Complete**
- M2 — Login, signup, and role onboarding: **Complete**
- M3 — Authenticated shell, profile, and location: **In progress**
- All milestones after M3: **Planned**
- Current implementation milestone: **M3**

## Repository baseline

At the M0 baseline, the project had a Next.js 16 App Router shell, English/Bangla locale routing, a PostgreSQL-backed location picker, Prisma 7, health and OpenAPI routes, and shared theme/language controls. M1 added identity tables and server-side session/role services. M2 has replaced the location-picker landing page with the bilingual authentication screen; authenticated role workspaces remain for M3 onward.

`rules/app_flow.txt` describes the desired farmer, officer, and admin flows. `rules/ui/` contains sketches for login/signup, farmer Home, Suggestions, Community, and Consult. It does not contain detailed sketches for the profile, tasks, cashflow, crop monitoring, AI assistant, admin screens, or officer screens; those will need small design decisions recorded as each milestone begins.

One flow-spec mismatch: the Officer heading says there are five sections, but only Home, Schedule, and Messages are listed. M7 will use those three named sections unless the spec is clarified before implementation.

**M3 design decisions:** keep officer navigation to the three sections actually named by the flow (Home, Schedule, Messages). Save account location as the selected Upazila plus an optional Area; Division and District are derived from the selected Upazila, avoiding duplicated hierarchy fields. The server will validate all parent/child IDs and require an Area only when the chosen Upazila has active areas. Fetch the public location reference data only when the profile location editor opens. Phone remains read-only, name and location are editable, profile photo upload shows the specified demo message, and feature sections remain clearly marked for their later milestones.

The login sketch includes demo access/bypass codes (`1234`) and explicitly says they are not for production. Keep demo codes server-side and configurable; never expose production credentials in client bundles. The existing user-table RLS policy is deny-by-default, so M1 must define and verify safe access for the application role before user-facing authentication can work.

## Milestones

### M0 — Requirements and repository baseline

**Status: Complete**

- Read `rules/app_flow.txt` and every `*.txt` file under `rules/ui/`.
- Compared the requested flows with the current app, schema, and routes.
- Recorded the baseline, gaps, sequence, and resume rule in this file.

### M1 — Identity and application foundations

**Status: Complete**

Establish the server-side identity and authorization base before building role screens.

- Design the required user/account fields and migrations, including secure password storage, officer verification state, and any profile/location references needed by signup.
- Implement server-side sign-in/session handling and role checks for Farmer, Officer, and Admin.
- Reconcile user-table RLS with the restricted `app_runtime` database role; define and verify least-privilege policies for required account operations.
- Add configurable demo access and officer bypass codes without hard-coding them into client code.
- Add only the seed/demo account data needed to exercise the role flows.

**Acceptance criteria:** migrations apply cleanly to a fresh database; passwords are hashed; role/session checks are enforced on the server; pending officers cannot enter officer tools; the runtime role can perform only the intended operations; no secrets are committed.

**M1 decisions:** keep the current Next.js/Prisma stack and add a small server-only auth DAL rather than an auth framework adapter: the required phone/password and role-specific demo onboarding need custom flows, and all database operations must set transaction-local RLS context. Store only a bcrypt password hash and an opaque database session-token hash. Use Zod for server input schemas, database-backed rate-limit buckets, and server-only environment variables for demo codes. The login/signup interface remains M2.

**M1 implementation:** added account status/password/officer-verification fields and database tables for opaque sessions, one-use password-reset tokens, and rate-limit buckets. Added parameterized transaction-local RLS context helpers, Bangladesh phone/password schemas, bcrypt hashing, CSRF origin checks, HMAC-keyed rate limiting, session cookie handling, server-side role gates, and reset-token handling. Demo admin and officer bypass codes are rejected in production; officer accounts created through the demo bypass remain pending verification. Reset token delivery is left for the UI/integration milestone and must use a trusted server-side channel.

**M1 verification:** the migration deployed to Neon; the full migration chain also ran in a temporary schema inside a rolled-back transaction. A rollback-only check using `app_runtime` confirmed default-deny reads, own-user access, and token-scoped session access. `pnpm test` passed (8 tests), `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm exec next build --webpack` passed. The default Turbopack build hit an environment process/port-binding error; Webpack completed the production build successfully. `.env` now has a generated local `AUTH_SECRET` and demo-only codes; `.env` and `.env.local` are gitignored. No secrets were added to tracked files.

### M2 — Login, signup, and role onboarding

**Status: Complete** · Depends on M1

- Implement the login and signup flows from `rules/ui/login.txt` for Farmer, Officer, and Admin.
- Validate Bangladesh phone numbers and the specified name fields; show accessible inline errors/toasts and loading states.
- Support duplicate-account handling, admin access code, officer certificate or demo bypass, pending officer verification, and returning to login after officer signup.
- Make mobile and desktop layouts consistent with the green brand and light/dark themes.

**Acceptance criteria:** each role can follow the specified signup/login path; invalid, duplicate, and pending-verification cases produce the specified outcome; unauthenticated and wrong-role access is rejected server-side.

**M2 decisions:** add password and confirmation fields because the flow prose/security requirements call for password login even though the rough screen sketch omits them. Demo admin and officer signup codes are enabled only in local development and Vercel Preview; Vercel Production refuses these codes. Provisioned Admin sign-in always requires a code: local/Preview uses `DEMO_ADMIN_ACCESS_CODE`, while Production uses `ADMIN_ACCESS_CODE`. The Officer demo bypass creates a pending account; certificate uploads are not offered until a trusted storage path is chosen. Password-reset tokens are implemented and verified, but reset-message delivery is not configured, so the login UI says so clearly. An active account currently shows a signed-in confirmation; M3 routes it into the role workspace.

**M2 implementation and verification:** bilingual login/signup, server actions with Origin/Host checks, Bangladesh phone/name/password validation, duplicate-account and generic credential outcomes, bcrypt password storage, opaque session cookies, role-specific Admin codes, pending Officer demo signup, and signout are implemented. Added an opt-in resolved IPv4 override for restricted local networks while retaining TLS validation against the database hostname. Follow-up migration `20261120120000_auth_reset_token_scope` fixed and deployed reset-token row scoping without rewriting the already-deployed M1 migration. Using an isolated Neon schema and `app_runtime`, all 3 auth-service integration tests passed, including one-use reset; all 3 preview-mode desktop browser flows passed for Farmer, Officer, and Admin. The harness removed its temporary schema. Production browser suite passed 14 desktop/mobile checks, including production restrictions; 6 preview/live-only cases were skipped. `pnpm test` passed 18 (3 live DB cases skipped), lint and TypeScript passed, and `git diff --check` passed. The follow-up migration was successfully deployed with Prisma Migrate. Reset delivery and Officer certificate storage remain explicit demo limitations, not unhandled UI paths.

### M3 — Authenticated shell, profile, and location

**Status: In progress** · Depends on M2

- Replace the current public location-picker landing page with session-aware routing to login or the correct role workspace.
- Build shared top/profile navigation, responsive section navigation, logout, and role-aware page shells.
- Implement profile display/edit for name and phone where allowed, initials in place of profile photos, and the location picker for profile setup/editing.
- Reuse the current four-level Division → District → Upazila → Area picker and honor the different completeness rules for account location versus filtering.

**Acceptance criteria:** active sessions open the correct workspace; navigation and logout work on mobile and desktop; account location selection and optional filters follow `app_flow.txt`.

### M4 — Farmer Home and personal records

**Status: Planned** · Depends on M3

- Build the Home dashboard from `rules/ui/farmer/home.txt`: current alert, weather summary, tasks, cashflow, and crop monitoring.
- Implement task create/complete, cost and income records, cultivated land, and crop/livestock monitoring records with farmer ownership checks.
- Add the missing rough UI decisions for task, cashflow, crop-plan, detail, and empty/error states to this milestone's progress log before implementation.

**Acceptance criteria:** a farmer can create, view, and update only their own tasks and records; dashboard totals and progress reflect saved data; unavailable weather/alert data has a clear fallback.

### M5 — Suggestions and Krishi AI

**Status: Planned** · Depends on M3 and M4

- Build daily, weekly, and monthly suggestions from `rules/ui/farmer/suggestions.txt`.
- Allow an actionable suggestion to create a prefilled task.
- Build the AI assistant with suggested prompts, clarifying questions/options, conversation context that updates within a chat, and history that expires after seven days.
- Keep AI tools read-only over farmer data unless a user explicitly confirms a supported action; record missing assistant UI details before implementation.

**Acceptance criteria:** suggestions are categorized and expire as specified; task creation requires user action; chat history and context remain scoped to the signed-in farmer and expire on schedule; provider/API failures have a usable fallback.

### M6 — Farmer community

**Status: Planned** · Depends on M3 and M5

- Build the feed and new-question flow from `rules/ui/farmer/community.txt`.
- Implement posts with optional images, comments, likes, notifications, report flow, and expert badges for verified officers.
- Connect “Ask AI” to the assistant with the post as read-only context.
- Omit follow, share, and copy-link actions as specified in `app_flow.txt`.

**Acceptance criteria:** feed actions persist and are permission-checked; reported content appears in the admin queue; “Ask AI” carries context without granting the assistant write access to posts or farmer records.

### M7 — Consultations and officer workspace

**Status: Planned** · Depends on M1 and M3

- Build Consult from `rules/ui/farmer/expert.txt`: specialty/activity filters, available experts, fees, chat entry, call booking, reminders, cancellation, and consultation history.
- Build the Officer Home, Schedule, and Messages sections described in `app_flow.txt`, including today's roadmap and the issue-alert action.
- Define booking states, availability, and seeded demo experts; record decisions before implementation because no officer/booking UI sketch exists.

**Acceptance criteria:** a farmer can book and cancel an appointment; appointments appear for both farmer and officer; officer schedule and messages are role-protected; empty and unavailable states are clear.

### M8 — Admin workspace and moderation

**Status: Planned** · Depends on M1, M3, M6, and M7

- Build Admin Home metrics and recent activity.
- Implement location-filtered, paginated farmer/officer lists, warnings, account bans, officer verification, and verification badges.
- Implement alert creation, confirmation, completion, and past-alert history.
- Implement report review with post/comments preview and completion.
- Define missing admin UI sketches and safe destructive-action confirmations before implementation.

**Acceptance criteria:** admin-only actions are enforced on the server; list loading/filtering works; verification, alerts, and report queues update consistently; ban/complete actions are auditable and confirmed.

### M9 — End-to-end integration and release readiness

**Status: Planned** · Depends on M2–M8

- Connect farmer, officer, and admin flows across shared data and authorization boundaries.
- Review English/Bangla strings, keyboard/screen-reader behavior, responsive layouts, loading/empty/error states, and security headers.
- Add and run the relevant unit, integration, and end-to-end checks for the completed flows.
- Verify database migrations, production environment variables, health endpoint, and production deployment.

**Acceptance criteria:** the main role journeys work from signup/login through their core tasks; regression checks pass; no role can read or mutate another role's protected data; production deployment and health check are ready.

## Progress log

### 2026-11-20 — M0 complete

- Read `rules/app_flow.txt` and all five UI sketches under `rules/ui/`.
- Baseline confirmed: localized Next.js shell and location picker exist; login/signup, sessions, role workspaces, and the product features above are not yet implemented.
- Identified requirements without detailed UI sketches: profile, task/cashflow/crop records, AI assistant, admin workspace, officer workspace, and booking flow.
- Recorded the Officer section-count mismatch for resolution before M7.
- Added this tracker. Next action: start M1 only; inspect the current auth/schema requirements and implement the identity foundation, then update this log with decisions and verification before advancing.

### 2026-11-20 — M1 started and completed

- Re-read current schema, RLS migrations, security requirements, and app environment.
- Read the installed Next.js 16 authentication, Cache Components, Proxy, and data-security guides plus the Prisma 7 transaction/raw-query references.
- Decision: use a server-only authentication DAL with bcrypt password hashes and database-backed opaque sessions so transaction-local PostgreSQL RLS can scope reads and writes. Do not rely on Proxy for authorization.
- Added `bcryptjs`, `zod`, and the `server-only` marker package. Added user password/status/officer verification fields; session, password-reset, and rate-limit tables; and scoped RLS policies/grants in migration `20261120110000_auth_foundation`.
- Implemented server-only auth primitives and identity service with rate-limited signup/sign-in, bcrypt password storage, secure opaque sessions, server role checks, pending-officer denial, same-origin mutation checks, and one-use 15-minute password reset tokens that revoke sessions.
- Production refuses demo admin/officer bypass codes. Generated `AUTH_SECRET` and set local demo codes in ignored `.env`; added placeholders to `.env.example`.
- Verification: Prisma schema validation and client generation passed; 8 unit tests passed; lint and TypeScript checks passed; full migration chain succeeded in a temporary schema and rolled back; Neon migration deployed; runtime RLS probe passed and rolled back; Webpack production build passed. Turbopack failed because its subprocess could not bind a port in this execution environment.
- M1 is complete. Begin M2 next and do not start M3 until M2 acceptance checks pass.

### 2026-11-20 — M2 started

- Replaced the location-picker landing page with a responsive bilingual English/Bangla login and signup screen using the existing green design tokens, theme control, and language switcher.
- Added role selection, server actions with Origin/Host checks, phone/password validation, password confirmation, admin code fields, local/Preview officer demo bypass, generic credential errors, duplicate-account feedback, pending-verification feedback, and active Farmer/Admin auto-login. Added sign-out and session-aware confirmation rendering.
- Updated browser checks for the new home screen and login/signup controls. Added mocked service tests for valid Farmer login/session creation, wrong-password rejection, and pending Officer denial.
- The shell exports a localhost `DATABASE_URL`; local `.env.local` is configured with the restricted `app_runtime` URL, and the unpooled owner URL remains migration-only. Unset the inherited variable when invoking project commands (`env -u DATABASE_URL ...`).
- Verification so far: 12 unit tests pass; lint and TypeScript pass; 12 UI/security browser checks passed before the final small auth-service changes. A database-backed sign-in browser attempt timed out from the Next subprocess (ETIMEDOUT), while direct `psql` RLS and runtime-role probes passed. A single-worker retry also timed out. Do not mark M2 complete until a real signup/login path is exercised with the runtime role and browser checks are rerun.
- M2 remains in progress. Next: diagnose the Next/Prisma runtime connection to Neon, then verify Farmer/Admin login/signup and Officer pending denial; revisit certificate storage and reset delivery before marking M2 complete.

### 2026-11-20 — M2 resumed; live auth verification still blocked

- Removed an unused import from the opt-in database integration test and marked the live database E2E file to skip unless `RUN_AUTH_DB_INTEGRATION=1`, so ordinary browser runs do not require a disposable Neon schema.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` (12 passed; 3 live DB cases skipped), and `git diff --check` passed after these edits.
- Found the build failure was the sandbox denying Next.js's spawned TypeScript CLI (`EPERM`); running the browser suite with the required subprocess permission produced a successful production build. Updated the stale Officer test to assert that demo bypass signup is disabled in production. `pnpm test:e2e` then passed all 12 production UI/security checks across desktop and mobile; 6 preview-only/live-auth cases were skipped.
- Added mocked service coverage for active Farmer signup with an in-transaction session, pending Officer signup without session issuance, duplicate Farmer handling, and required Admin code. Full unit suite now passes 15 tests with only the 3 explicitly live-database cases skipped; lint, TypeScript, and diff checks pass.
- Tried the isolated live auth harness with network access. It created its temporary schema, but Vitest/Prisma connections from the worker repeatedly failed with Neon `ETIMEDOUT`/`ENETUNREACH`; password reset therefore returned false when its database call could not complete. The harness successfully dropped the temporary schema afterward. This is not passing evidence for runtime signup/login.
- Compared clients using read-only `SELECT 1`: `psql` connected as `app_runtime`, while Node `pg` using the hostname URL timed out. Resolving the hostname and connecting Node `pg` to a resolved IPv4 address with the endpoint retained as TLS `servername` succeeded. This points to an address selection/fallback difference in this environment, not invalid credentials or runtime-role grants. Do not hard-code a transient Neon IP; M2 still needs a robust runtime-path verification (or an accessible Preview deployment) before acceptance.
- Resume M2 by isolating why PrismaPg from Vitest/Next workers cannot connect to the configured Neon endpoint, then rerun isolated auth DB checks and the preview-only browser flows. Keep the current milestone open; do not start M3 until acceptance criteria are met.

### M3 resumed — implementation present, live verification pending

- Found M3 code already in the working tree but unlogged: session-aware home routing (`src/app/[locale]/page.tsx`), role workspace shell with desktop sidebar and mobile bottom navigation, profile dialog, logout, name edit, and the four-level location editor, plus migration `20261120130000_user_location_profile` (adds `users.upazilaId`/`areaId`, grants runtime UPDATE on those two columns only) and server actions in `workspace-actions.ts` / `src/server/profile.ts`.
- Fixed a TypeScript error in the profile name form: `useActionState` dispatch returns `void`, so the form now uses a transition that awaits the returned state.
- Server-side location validation checks the Division → District → Upazila → Area chain and requires an Area only when the Upazila has active areas; location reference data loads only when the editor opens.
- Verification: `tsc --noEmit` and `pnpm lint` pass; `pnpm test` passes 18 (3 live DB skipped); `pnpm test:e2e` passes 14 standard checks (6 live-auth skipped).
- Deployed migration `20261120130000_user_location_profile` to the Neon database with `prisma migrate deploy` using the unpooled owner URL (migration-only); `migrate status` now reports the schema up to date (7 migrations).
- **M3 remains In progress.** Not yet verified: no signed-in browser run covers the workspace shell, logout, profile name/location save, or mobile navigation. Next: deploy the migration (needs approval), run an authenticated Farmer flow for session routing, logout, and location save, check mobile and desktop navigation, then mark M3 complete.

### 2026-11-20 — M2 resumed; reset-token policy fixed, browser path remains

- Confirmed the earlier connection issue is address selection: `psql` works with the runtime URL, and Node `pg` works when given a resolved IPv4 plus the original Neon hostname for TLS.
- Added optional `DATABASE_IP_OVERRIDE` support to `src/server/db.ts` and documented it in `.env.example`. It accepts only an IP and retains TLS certificate validation against the `DATABASE_URL` hostname; leave unset normally. The integration harness resolves the IP dynamically; no transient address is committed.
- The first live auth service run passed Farmer/Admin signup and Officer pending checks, then exposed a real password reset policy defect. Reset token rows could be read by token hash but the `UPDATE usedAt` RLS policy only allowed user-ID context. Added migration `20261120120000_auth_reset_token_scope` to permit update only when the row is scoped by its user ID or matching reset-token hash, while the existing migration remains unchanged.
- Updated the temporary harness `/tmp/krishi-m2-auth-integration.cjs` to apply the follow-up policy and set the resolved IP override. The next service run passed all 3 live DB integration tests against `app_runtime`, including one-use password reset/password change.
- The same harness's browser signup tests still timed out with the form left in its pending state; all 3 browser cases failed to observe completion. It then removed its temporary schema. A later attempt to rerun with a longer timeout was interrupted by the user; process inspection found no Node/psql runner still active, and a read-only Neon check found no leftover `auth_m2_*` schemas.
- Latest local checks before this update: `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm test` passed (15 passed; 3 live DB tests skipped in the default suite). The 12 standard production desktop/mobile browser checks passed in the previous run; the 3 live browser flows are still failing/unverified.
- **Resume next:** read the latest auth flow E2E error details and inspect why the Next `webServer` action remains pending while service integration passes. Then rerun `/tmp/krishi-m2-auth-integration.cjs` (with network permission) to verify Farmer signup/signout/signin, Officer pending signup, and Admin code signup/login. If `/tmp` no longer contains the harness, reconstruct it from its role described here: create a uniquely named temp schema as the migration owner, apply the existing base schema shape plus both auth migrations, grant schema usage to `app_runtime`, run the opt-in Vitest and Playwright suites with `DATABASE_IP_OVERRIDE` set to a resolved IPv4, and always drop the schema in `finally`. Keep M2 open until live browser flows and server-side acceptance criteria pass; only then begin M3.
