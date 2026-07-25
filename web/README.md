# Abs-Track web app

Next.js 16 application for the Abs-Track coaching platform. See the [project README](../README.md) for full setup, routes, deploy, and testing.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on **http://localhost:3010** |
| `npm run build` | Production build |
| `npm run db:push` | Apply Drizzle schema to Postgres |
| `npm run db:seed` | Seed tenant, personas, content blocks, pilot clients |
| `npm run test` | Vitest (unit + integration; integration needs Docker Postgres) |
| `npm run test:e2e` | Playwright E2E (port 3011 by default) |
| `npm run guides:pdf` | Generate PDF user guides → `../docs/guides/` |

## Environment

Copy `.env.example` to `.env.local`. For local dev without Firebase, leave `NEXT_PUBLIC_FIREBASE_*` empty and use dev personas on `/login`.

## Key directories

- `app/` — pages and API routes
- `components/coach/` — command center, sparklines, recipe drawer
- `components/member/food-diary/` — native nutrition logging
- `lib/copy/` — Helna-approved UI strings
- `lib/db/schema.ts` — Drizzle schema (members, plans, food diary, broadcasts, etc.)
