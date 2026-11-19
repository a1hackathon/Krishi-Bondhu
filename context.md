# X / Krishi Bondhu: project context

Read this first in a new conversation. It explains how the code fits together, what is built, what is not, and what to do next, so you can add features without reading every file.

Last updated at the end of the session that finished `how_to_run.md`, `dotenv` and the location picker fix.

---

## 1. What the product is

X (Bangla: Krishi Bondhu) is a platform for farmers. The full product, from `rules/product_requirements.txt`, covers AI farm planning, crop and livestock monitoring, a farmer community, expert consultations, login, and emergency alerts. Three roles: **Farmer**, **Officer** (verified expert), **Administrator**.

**Today only a landing page exists.** It shows a location picker (division → district → upazila → area) in English and Bangla. Nothing else from the product is built yet.

Other rule files in `rules/` (read them when the matching work starts, they are short):
- `security.txt`: the security requirements (hashed passwords, RLS, CSRF, cookies, rate limiting, upload limits, and so on).
- `database.txt`: database rules.
- `technology_stack.txt`: the fixed stack. Do not swap parts of it.
- `ui_ux.txt`: UI rules.
- `app_flow.txt`: says that when a login session is active, the Home screen is shown; otherwise the Login screen is shown. Login is not built yet.

---

## 2. Stack (fixed by `rules/technology_stack.txt`)

- Next.js **16.4.6** App Router, Turbopack, Cache Components enabled. Note: this is not the Next.js from older training data. Read `node_modules/next/dist/docs/` before writing Next code (AGENTS.md requires it).
- React 19.3, TypeScript 5.9, Tailwind 4, shadcn/ui (`components.json`).
- Prisma **7.10.1** with PostgreSQL through `@prisma/adapter-pg`. Do not use 8.x release candidates.
- next-intl 4.14 for English/Bangla.
- Vitest (unit), Playwright (e2e). pnpm 12.18.0 (pinned in `package.json`).
- Deployment target: Vercel.

---

## 3. Folder map and how the modules connect

```
prisma/
  schema.prisma                 Prisma models. Only `User` exists (uuid id, unique phoneNumber, role FARMER|OFFICER|ADMIN, fullName, timestamps).
  migrations/                   Applied SQL migrations (see section 5).
  location_data.sql             OLD copy; the data now lives in a migration. Do not re-run it.
prisma7.config.ts               Prisma CLI config. Loads `.env` via dotenv, reads DATABASE_URL.
src/
  generated/prisma/             GENERATED Prisma client. Git-ignored. Recreate with `pnpm exec prisma generate`. Never edit.
  proxy.ts                      Request entry point (Next 16 calls this "proxy", not "middleware").
  app/
    layout.tsx                  Root layout: fonts, theme script, globals.css.
    globals.css                 Tailwind + theme variables.
    [locale]/layout.tsx         Locale layout: sets locale, NextIntlClientProvider, html lang, generateStaticParams for en/bn.
    [locale]/page.tsx           Home page (landing). Renders LocationPicker from DB data.
    api/v1/health/route.ts      GET liveness probe (JSON).
    api/v1/openapi.json/route.ts  Serves the OpenAPI document from src/server/openapi.ts.
    fonts/                      Hind Siliguri woff2 files.
  components/
    location-picker.tsx         Client component: four dependent Selects. Receives plain arrays as props.
    language-switcher.tsx       EN/BN switch (uses i18n/navigation).
    theme-toggle.tsx            Light/dark toggle.
    html-lang.tsx               Sets <html lang> on the client.
    ui/button.tsx, ui/select.tsx  shadcn/ui primitives. Add new ones with the shadcn CLI, not by hand.
  i18n/
    routing.ts                  Locales: ["en","bn"], default "en", localePrefix "always".
    navigation.ts               Locale-aware Link/redirect helpers.
    request.ts                  next-intl server config (loads messages).
  lib/utils.ts                  cn() helper for classnames.
  server/                       SERVER-ONLY code. UI should not import db directly.
    db.ts                       Shared Prisma client (singleton). Throws if DATABASE_URL is missing.
    logger.ts                   JSON logger; level from LOG_LEVEL.
    health.ts                   Pure health-report function (no Next types). Has health.test.ts.
    health.test.ts              Unit test (Vitest).
    openapi.ts                  OpenAPI document builder.
    location/types.ts           Division/District/Upazila/Area/LocationData types.
    location/queries.ts         getLocationData(): four $queryRaw reads (active rows only).
messages/en.json, bn.json       All UI strings. Add new strings to BOTH files.
e2e/home.spec.ts                Playwright tests: home page, HTTP→HTTPS redirect, security headers.
next.config.ts                  Security headers + CSP, poweredByHeader false.
playwright.config.ts            e2e config: builds, starts `next start -p 3100`, desktop + mobile projects.
vitest.config.mts               Unit test config.
eslint.config.mjs               Lint config.
how_to_run.md                   Simple run steps for a user.
README.md                       Original setup notes.
AGENTS.md                       Project rules for the agent (Next docs first, etc.).
```

### Request flow (today)

1. Browser requests `/en` or `/bn`.
2. `src/proxy.ts`:
   - In production only: if `x-forwarded-proto` is `http`, redirect 308 to https.
   - Paths starting with `/api/` or with a file extension pass through untouched.
   - Everything else goes to next-intl locale routing (adds/validates `/en` or `/bn`).
3. `src/app/[locale]/layout.tsx` sets the locale and messages.
4. `src/app/[locale]/page.tsx`:
   - `Home` renders a Suspense boundary.
   - `HomeContent` calls `await connection()` (opts into request-time rendering; this fixed the `crypto.getRandomValues` prerender warning), reads the locale, and loads translations.
   - `LocationPickerData` calls `getLocationData()` (`src/server/location/queries.ts`) → `db` (`src/server/db.ts`) → PostgreSQL.
   - Result is passed as props into the client `LocationPicker`.
5. Security headers come from `next.config.ts` on every response.

### Database access rule

- Server code imports `db` from `@/server/db`. Put new DB reads in `src/server/<domain>/` modules, as `location/queries.ts` does.
- Components never import `db`. They get data as props from server components, or from route handlers.

---

## 4. Conventions to keep

- **Strings:** every visible string goes in both `messages/en.json` and `messages/bn.json`, under a namespace (`home`, `app`, …). Read with `getTranslations` (server) or `useTranslations` (client).
- **Locale URLs:** always under `/[locale]/...`. Links use `src/i18n/navigation.ts`.
- **Server-only:** anything touching secrets, DB, or the logger goes in `src/server/`. Put `import "server-only"` at the top if it is not already there when you add a new module (not yet added to existing ones).
- **Config and secrets:** only in `.env` / `.env.local` (git-ignored). `.env.example` documents the keys. Never commit real values.
- **Minimal edits:** the user explicitly does not want unnecessary changes to working files. Add new files for new features; touch existing ones only where needed.
- **Tests:** each fix or feature gets a test. Unit tests next to the module (`*.test.ts`); browser tests in `e2e/`.
- **UI:** shadcn/ui components; match the existing Tailwind tokens (`bg-card`, `text-muted-foreground`, `ring-border`, etc.).
- **Next 16 specifics:** `proxy.ts` not `middleware.ts`; `params` is a Promise (await it); Cache Components is on, so reading request data needs `connection()` or a `"use cache"` decision.

---

## 5. Database state

### Schema
`User` table only. No password hash, session, reset-token, or role-assignment tables yet.

### Migrations (applied in order)
1. `20261112080200_init_users`: `User` table.
2. `20261114072643_enable_row_level_security`: RLS enabled.
3. `20261114080000_location_reference_data`: divisions (8), districts (64), upazilas (576), areas (4540). Marked applied with `migrate resolve` because the local DB already had the data.
4. `20261114090000_rls_all_tables_least_privilege`:
   - Creates NOLOGIN role `app_runtime` (NOBYPASSRLS).
   - Schema USAGE granted.
   - SELECT on the four location tables; RLS on, policy `reference_read` USING (true).
   - SELECT/INSERT/UPDATE/DELETE on `users`; RLS on with **no policies**, so the runtime role sees zero user rows until per-user policies are added.

### Roles
- `postgres` (superuser, BYPASSRLS): owner, used locally. RLS does NOT bind it.
- `app_runtime` (NOLOGIN, NOBYPASSRLS): intended production runtime role. Its LOGIN and password are set out of band with `ALTER ROLE app_runtime LOGIN PASSWORD '...'`, never in a migration. See `.env.example`.

### Local database
- Database `krishi_bondhu` on localhost:5432.
- Do not write passwords into any file in the repo.

---

## 6. Environment and scripts

- `DATABASE_URL` is required. Read from `.env` by Prisma CLI (via dotenv) and from the process environment by Next and `db.ts`.
- **Known trap:** if `DATABASE_URL` is exported in the shell, it overrides `.env`. Use `env -u DATABASE_URL <command>` or `unset DATABASE_URL`. This caused earlier e2e failures.
- `LOG_LEVEL` optional (logger).

Scripts (`package.json`):
- `pnpm dev`: dev server, port 3000.
- `pnpm build` / `pnpm start`: production build and server.
- `pnpm lint`
- `pnpm test`: Vitest (1 unit test).
- `pnpm test:e2e`: Playwright against a production build on port 3100 (desktop + mobile).
- `pnpm exec tsc --noEmit`: typecheck.
- `pnpm exec prisma generate`, `pnpm exec prisma migrate deploy` (or `migrate dev` locally), `pnpm exec prisma validate`.

Ports: 3000 dev, 3100 e2e/start, 3200 may be used by other runs. If a port is busy, check with `ss -ltnp` and kill the PID. Do not use `pkill -f next-server` from a shell whose command line contains that text; it kills the shell.

---

## 7. Security status (vs `rules/security.txt`)

| Area | Status |
|---|---|
| HTTPS redirect | Done in `src/proxy.ts`, production only (dev has no TLS). Tested in e2e. |
| Security headers (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP) | Done in `next.config.ts`. Tested in e2e. |
| X-Powered-By removed | Done. Tested. |
| CSP `script-src` | Still has `'unsafe-inline'` in prod. The theme script in `src/app/layout.tsx` is inline. TODO: nonce-based CSP. |
| DB least privilege / RLS on tables | Done for the four location tables and `users` (see section 5). Verified via psql. |
| Per-user RLS policies on `users` | NOT done. Needs a session-set setting (e.g. `app.user_id`) once auth exists. |
| Password hashing | NOT built (no auth). Use argon2 or bcrypt; check the stack file first. |
| Sessions / secure cookies | NOT built. |
| CSRF | NOT built. Needed for forms and route handlers that change state. |
| Login rate limiting | NOT built. |
| Reset links with expiry | NOT built. |
| Server-side validation (Zod) | NOT built. Zod not in deps yet. |
| Upload size limits | No upload feature exists. Define the limit when the feature is added. |
| Server-side price checks / webhook signatures | No payments exist. Not applicable yet. |
| Admin lock / RBAC | NOT built (no auth). |
| Debug off in production | Config side: no debug flags. Verify when new features are added. |
| Dependency updates | Pending (see section 8). |
| Unused packages removed | Done: `pg`, `@types/pg`, `jsdom`. `dotenv` added as dev dep (used by `prisma7.config.ts`). |
| Git history secret scan | Only a grep was done (no tool-based scan). Not complete. |
| Crypto warning | Fixed (`connection()` in `[locale]/page.tsx`). |
| Final report mapping each security item to fix/test/N-A | NOT written. |

---

## 8. Dependency status

- **Updates available:** Next (already on 16.4.6, check newer patch), Prisma 7.10.1 (keep; 8.0.0-rc is not for use), TypeScript 5.9.3 (7.0.2 is a major, check first), ESLint 9 → 10 (install warned that eslint@9.39.5 is deprecated), next-intl 4.14.10 → 4.15.1, react/react-dom 19.3.0 → 19.3.1, tailwind 4.3.3 → 4.3.5.
- **Known advisory:** `deepmerge` (low) pulled by `shadcn`; no patch available.
- **Peer dependency warnings** from pnpm: run `pnpm peers check` to list. Not yet investigated.
- **Removed:** `pg`, `@types/pg`, `jsdom` (unused).
- **Added:** `dotenv` 18.0.10 (dev).

---

## 9. Current state of the work

### Done and verified
- Location picker works at `/en` and `/bn`. Verified in a headless browser (Barisal → Barguna → Amtali → Amtali).
- `crypto.getRandomValues` prerender warning fixed. Production build clean; typecheck and lint pass.
- Reference data is tracked as a migration.
- RLS and least-privilege role on the existing tables.
- HTTPS redirect (prod), security headers, and related e2e tests.
- `how_to_run.md` written.
- `dotenv` declared in `package.json`.
- `context.md` (this file).

### Last known test results
- `pnpm test`: 1 unit test passing.
- `pnpm test:e2e`: 10/10 passing (desktop + mobile) earlier in the session. Re-run before relying on it, since `dotenv` and the `connection()` change came after.

### Not committed
- Git has one commit. All the changes above are uncommitted. Nothing has been committed or pushed.

### Dev server
- It was started in the background in an earlier shell and may or may not still be running. Check port 3000 before starting another.

---

## 10. Known small issues

- `src/server/location/queries.ts` line 1 comment says data is "loaded from prisma/location_data.sql". That file is no longer the source; the migration is. Fix the comment when next touching that file.
- `prisma/location_data.sql` still exists as a leftover copy. Safe to delete once confirmed unused, but do not delete it without asking.
- The layout uses `instant = false` and `generateStaticParams`; leave as is unless there is a reason to change.
- pnpm reports peer dependency issues; not yet reviewed.

---

## 11. Next steps (in priority order)

1. Re-run `pnpm test`, `pnpm test:e2e`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` to confirm the current state.
2. Decide and build **authentication** (the biggest gap):
   - Add `passwordHash` (and session/reset-token tables) via a new migration. Never edit applied migrations.
   - Hash with argon2 or bcrypt (check `technology_stack.txt`).
   - Session cookie: httpOnly, Secure, SameSite; server-side session store.
   - CSRF protection on state-changing routes and forms.
   - Zod validation on all inputs (add the dependency).
   - Login rate limiting.
   - Password reset tokens with expiry.
   - Per-user RLS policies on `users`, keyed on a session-set setting.
   - Admin role lock (server-side RBAC).
   - Each piece with a test.
3. Nonce-based CSP (remove `'unsafe-inline'` for scripts).
4. Dependency updates (section 8), one at a time with tests after each.
5. Git history secret scan with a tool (e.g. gitleaks or trufflehog, if available; otherwise `git log -p` with patterns).
6. Final report: map each `rules/security.txt` item to a fix, a test, or "not applicable because feature X does not exist".
7. Commit the work once the user says so.

---

## 12. Rules for working in this repo

- Ask before big structural changes. Each write and shell command is approved by the user in this permission mode.
- Read the Next docs in `node_modules/next/dist/docs/` before writing Next code.
- Prefer `edit_file` over rewriting files.
- Never print or store real secrets (DATABASE_URL passwords, role passwords) in files, logs, or messages.
- Do not run migrations on a live database by hand; use `prisma migrate deploy` / `migrate dev`.
- Do not edit `src/generated/prisma/`.
- Do not commit unless asked.
