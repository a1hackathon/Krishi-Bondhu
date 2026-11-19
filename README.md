# X (Farming Platform)

A responsive, bilingual (English and Bangla) web application for farmers, agricultural experts, and administrators. Built with Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui on Radix UI, Prisma with PostgreSQL, Vitest and Playwright. Deployed on Vercel.

The stack is defined in `rules/technology_stack.txt`. Keep new work within it.

## Getting Started

1. Install dependencies with pnpm: `pnpm install`
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`. Never commit real credentials.
3. Apply migrations: `pnpm prisma migrate dev`
4. Start the dev server: `pnpm dev`, then open http://localhost:3000

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit and component tests |
| `pnpm test:e2e` | Playwright end-to-end tests |

## Project Layout

- `src/app/[locale]` — localized pages and layouts
- `src/app/api/v1` — versioned REST route handlers (`/api/v1/health`, `/api/v1/openapi.json`)
- `src/server` — framework-independent server modules (health, logger, OpenAPI contract)
- `src/i18n` — locale routing and request configuration
- `src/components` — theme toggle, language switcher, and shadcn/ui components in `src/components/ui`
- `messages/` — English and Bangla translation resources. All user-facing text lives here.
- `prisma/` — schema, migrations, and `location_data.sql` (administrative location reference data)
- `src/app/fonts` — self-hosted Hind Siliguri font files

## Design System

### Color palette

Defined as shadcn CSS variables in `src/app/globals.css`. Components use semantic tokens only.

- **Brand (primary):** green, `oklch(0.48 0.13 150)` in light theme and `oklch(0.76 0.15 150)` in dark theme. Foreground on primary is near-white in light mode and a dark green-charcoal in dark mode.
- **Light theme:** warm off-white background `oklch(0.985 0.008 85)`, with card and border tones shifted to the same warm hue.
- **Dark theme:** green-tinted charcoal background `oklch(0.19 0.015 150)`. It is a separately tuned palette, not an inversion of the light theme.
- **Semantic colors:** `success` (green), `warning` (amber), `destructive` (red), and `info` (blue). Use each only for its meaning.
- **Contrast:** text and primary surfaces target WCAG AA (4.5:1). Muted text, borders, charts, badges, and focus rings still need a measured contrast check in both themes.

Theme preference is stored in `localStorage` under `theme`. On first visit the operating-system preference is used.

### Typography

One self-hosted family, Hind Siliguri, covers Latin and Bengali glyphs. Fallbacks are Noto Sans Bengali, `system-ui`, and `sans-serif`.

### Icons

lucide-react only.

## Component Policy

- shadcn/ui is the only component library. `components.json` uses the `radix-nova` style, so shadcn components are built on Radix UI primitives.
- Build screens from shadcn/ui components and project components composed from them.
- No third-party map widgets. Maps are out of scope for the initial release.
- **Documented exceptions:** none so far. If a widget is missing from shadcn/ui, first try a Radix primitive. If neither fits, write the smallest project-owned component using the design tokens, and record the exception here with its reason.

## Localization

- All interface strings go in `messages/en.json` and `messages/bn.json`. Keep the two files' keys in step.
- Routes are locale-prefixed (`/en`, `/bn`).

## Location

Location uses the browser Geolocation API only. It is requested from a user action, never on page load. The product must still work when permission is denied, or when location is entered manually.

## Deploy

Deploy to Vercel and connect the Git repository for preview and production builds. Set `DATABASE_URL` and `LOG_LEVEL` as Vercel environment variables. Run Prisma migrations against the managed PostgreSQL database, not by hand on a live database.
