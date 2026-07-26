# Fitness Coach Platform (Abs-Track by Helna)

White-label, mobile-first coaching platform — local prototype with production staging on Oracle Cloud.

**Live staging:** [https://abstrack.duckdns.org](https://abstrack.duckdns.org)

## Quick start

### 1. Start PostgreSQL

From the project root:

```powershell
docker compose up -d
```

Database: `postgresql://fitness:fitness@localhost:5435/fitness_coach`

### 2. Install and migrate

```powershell
cd web
npm install
copy .env.example .env.local
npm run db:push
npm run db:seed
```

### 3. Run the app

```powershell
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

> **Note:** Dev runs on port **3010** to avoid conflicts with other local Node apps. E2E tests use a separate server on **3011** (see [Testing](#testing)).

## Local dev without Firebase

Firebase is optional for local work. Leave `NEXT_PUBLIC_FIREBASE_*` empty in `.env.local` and use dev personas on `/login`:

| Persona | Lands on |
|---------|----------|
| **Coach — Helna** | `/coach` command center |
| **Member — Demo (Hetal plans)** | `/member` PWA with full plans |
| **Member — Hetal / Avinash / Shruti** | Pilot client accounts |
| **Member — New (no plans)** | Empty dashboard (onboarding test) |

Use **Switch persona** in the dev banner or `/login?switch=1` to change accounts without restarting.

With Firebase configured, `/login` shows **Continue with Google** only (production behavior).

## Production Firebase + Gemini setup

1. Create a Firebase project with **Google Sign-In** and **Storage** enabled.
2. Copy web app config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
3. Generate a service account key → set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
   - Helper: `deploy/import-firebase-admin.ps1 -KeyJsonPath <path-to-json>`
4. Set `COACH_EMAILS=your-coach@gmail.com` so first Google sign-in gets coach role; all others become members (auto-provisioned).
5. Optional: set `GEMINI_API_KEY` for real meal photo analysis (otherwise dev stub runs).
6. Optional: set `NUTRITIONIX_APP_ID` + `NUTRITIONIX_APP_KEY` for live food search (otherwise dev stub foods).

Full checklist: [docs/firebase-production-setup.md](docs/firebase-production-setup.md)

## Routes

### Prospect & auth

| Path | Description |
|------|-------------|
| `/` | Prospect landing |
| `/philosophy` | FM-01 story pillars |
| `/quiz` | FM-02 qualifying quiz |
| `/login` | Google Sign-In (or dev persona picker) |

### Member PWA

| Path | Description |
|------|-------------|
| `/member` | Dashboard — streak, compliance, program phase strip, optional coach note, today's workout |
| `/member/check-in` | Weight, sleep, energy, soreness, meal photo; optional add to food diary |
| `/member/workouts` | Today's session; set completion persists across visits |
| `/member/nutrition` | Macro targets, native food diary (+ search/barcode), coach content blocks |
| `/member/messages` | In-app chat with coach |

### Coach portal

| Path | Description |
|------|-------------|
| `/coach` | Command center — check-in queue, sparklines, trend alerts, AI review, recipe drawer |
| `/coach/settings` | Brand accents, optional coach note, **download how-to PDF** (coach only) |
| `/coach/members` | Roster by status; at-risk badges from trend rules |
| `/coach/members/[id]` | Full profile, program phases, food diary summary, check-in history, messages |
| `/coach/plans` | Plan delivery — client list |
| `/coach/plans/[id]` | Client plan hub — publish, **Prepare delivery**, email / WhatsApp / link |
| `/coach/plans/[id]/training` | Training builder — gym/home templates, edit, Save & publish |
| `/coach/plans/[id]/nutrition` | Nutrition builder — macros, blocks, Save & publish |
| `/coach/pilot` | Helna pilot metrics (<5 min publish target) |
| `/coach/content-blocks` | Reusable content library (Abs-Track diary primary; MFP optional) |
| `/coach/exercises` | Exercise catalog — expand, edit, delete |

### Public & platform

| Path | Description |
|------|-------------|
| `/p/[token]` | Public read-only plan viewer (magic link from delivery) |
| `/platform` | Platform admin — multi-tenant console (ops) |

## Key features

### Coach command center

- **Trend visualization:** 7-day weight/sleep sparklines and mini compliance rings per check-in row
- **Rules-based alerts:** sleep decline, missed check-ins, low protein → “Needs attention” on queue and member list
- **Recipe quick-fix drawer:** filterable high-protein recipes from content blocks; append suggestion to coach note
- **Inline food diary:** today's macro totals while reviewing a check-in
- **Approve animation:** Framer Motion on coach routes only (not bundled on member PWA)

### Brand & voice

- **Tenant branding:** `brandingJson` drives CSS variables (`--brand-workout`, `--brand-diet`, etc.)
- **Coach settings:** dual accent (workout + nutrition) or single accent with derived secondary
- **Copy bible:** Helna-approved micro-copy in `web/lib/copy/` (command center, dashboard, empty states)
- **Typography:** Instrument Serif display font on coach portal; Montserrat on member PWA

### Member experience

- **Native food diary:** search, manual entry, barcode stub, meal photo analysis; running macro totals
- **Program phase strip:** coach-defined phases tied to program start/end dates
- **Optional coach note:** pinned on dashboard when Helna posts one (no empty placeholder when absent)
- **Streak toasts:** CSS-only celebration at 7/30 days

### Plan delivery

1. `/coach/plans` → select client
2. Open **training** or **nutrition** builder
3. **Clone → next week** or **+ Gym / Home template** (full ASIS-depth week from catalog) / **+ Create week 1**
4. Edit exercises/macros → **Save** or **Save & publish**
5. **Publish** logs assembly time to `/coach/pilot` (target under 5 minutes)
6. Client plan hub → **Prepare delivery** (one PDF pack for published training + nutrition)
7. **Preview PDF** / **Send email** / **Send on WhatsApp** (click-to-send) / **Copy link**
8. Members open `/p/<token>` or the PDF (QR on cover) without signing in; sign in to log workouts
9. In-app: banner on `/member` + PDF download on workouts/nutrition
10. PDF resolves `{{client_name}}` etc., member-specific health notes, grocery as a one-page table

Env (optional): `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`. Without Resend, email dry-runs to the server log.

### Templates & content defaults

- New tenants (and re-seed) install a shared **exercise catalog** (slug-keyed) and **gym/home** training templates via `installTenantPlanDefaults`.
- Content blocks skip the shared “Hetal Focus” health list — health notes are built per member at delivery time.
- Offline sample PDFs: `cd web && npm run plans:pdf` → `docs/plan-samples/`.

## Stack

- **Next.js 16** + Tailwind 4 — `web/`
- **PostgreSQL** via Docker + Drizzle ORM
- **Firebase Auth** (Google) + Storage
- **Gemini Flash** for meal photo analysis
- **pdfkit** — plan packs + coach how-to guide
- **Framer Motion** — coach routes only (dynamic import)
- **YouTube embeds** for exercise videos

## User guides (PDF)

**Coach Settings** → **Download how-to guide (PDF)** — simple non-technical guide covering coach, active member, and new-member journeys (coach-only API).

Also generate printable detailed guides:

```powershell
cd web
npm run guides:pdf
```

Output: `docs/guides/` (dev sign-on, coach, member, new member/prospect, plus `abstrack-how-to-guide.pdf`).

Optional staging URLs:

```powershell
$env:GUIDE_BASE_URL="https://abstrack.duckdns.org"
npm run guides:pdf
```

## Testing

**Prerequisites:** Docker Postgres on `:5435`, `npm run db:push && npm run db:seed`.

```powershell
cd web
npm run test          # Vitest — unit + API integration
npm run test:e2e      # Playwright — builds + serves on :3011
```

| Suite | Location | Notes |
|-------|----------|-------|
| Unit | `web/lib/**/*.test.ts` | Brand, trends, plan delivery tokens/vars, PDF packs, how-to guide, nutrition, quiz |
| API | `web/tests/api/integration.test.ts` | Leads, members, check-ins, **plan-deliveries**, messages (requires Postgres) |
| E2E | `web/tests/e2e/*.spec.ts` | Prospect, member, coach, auth flows |

**Without Docker:** unit tests only:

```powershell
npx vitest run --exclude tests/api/integration.test.ts
```

Scenario matrix: [web/docs/test-scenarios.md](web/docs/test-scenarios.md) (includes **Batch — Plan delivery + templates**)  
Latest run: [web/docs/test-results.md](web/docs/test-results.md)

E2E uses port **3011** via `scripts/e2e-server.mjs` (production build with Firebase cleared + `E2E_DEV_AUTH=1`). Runs alongside dev on **3010**.

```powershell
$env:PLAYWRIGHT_BASE_URL="http://localhost:3010"
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
npm run test:e2e
```

## Production deploy (Oracle Cloud)

**Live URL:** [https://abstrack.duckdns.org](https://abstrack.duckdns.org)

Deploy uses **SSH only** — no Oracle Console login needed after the VM exists.

| Step | Doc / command |
|------|----------------|
| Firebase + Google auth | [docs/firebase-production-setup.md](docs/firebase-production-setup.md) |
| DuckDNS + VM + Caddy + Postgres | [docs/oracle-vm-hosting-setup.md](docs/oracle-vm-hosting-setup.md) |
| Env template | [deploy/env.production.example](deploy/env.production.example) |
| **Redeploy (Windows)** | `deploy\redeploy.bat` |
| Build + upload app | `deploy\deploy-app.ps1 -Remote ubuntu@<ip> -KeyPath <key> -EnvFile web\.env.production.local` |
| Database migrate/seed | `deploy/migrate-db.ps1` or SSH tunnel + local `npm run db:push` (see Oracle doc) |

First-time setup:

```powershell
copy deploy\env.production.example web\.env.production.local
# Fill Firebase keys — see docs/firebase-production-setup.md
```

Redeploy after code changes:

```powershell
deploy\redeploy.bat
```

Or explicitly:

```powershell
deploy\deploy-app.ps1 `
  -Remote ubuntu@129.154.47.155 `
  -KeyPath $env:USERPROFILE\.ssh\oracle-fitness-coach `
  -EnvFile web\.env.production.local
```

After schema changes (`plan_deliveries`, exercise `slug`, template `key`, etc.), run `npm run db:push` on the server (or via `deploy/migrate-db.ps1`) **before** redeploying app code that depends on new tables/columns.

## Project layout

```
fitness_coach/
├── deploy/                 # Caddy, systemd, redeploy.bat, deploy scripts
├── docs/
│   ├── guides/             # PDF user guides (generated)
│   ├── plan-samples/       # Sample plan-pack PDFs
│   ├── firebase-production-setup.md
│   └── oracle-vm-hosting-setup.md
├── docker-compose.yml      # Local Postgres (:5435)
├── documents/reference/    # Helna PDF plans
└── web/
    ├── app/                # Routes + API (incl. /p/[token], /platform)
    ├── components/         # Auth, coach, member, food diary, brand
    ├── lib/
    │   ├── copy/           # Helna copy bible (coach + member strings)
    │   ├── coach/          # Trend alerts, broadcasts, check-in enrichment
    │   ├── plans/          # Templates, delivery snapshot/tokens, install defaults
    │   ├── pdf/            # Plan packs + coach how-to guide
    │   ├── notify/         # Email / WhatsApp / phone helpers
    │   ├── nutrition/      # Food diary, search provider
    │   └── db/             # Schema, seed, content blocks
    ├── tests/              # Vitest API + Playwright E2E
    └── docs/               # Test scenarios and results
```
