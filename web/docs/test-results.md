# Test Results Report

Generated: 2026-07-24  
Environment: Local dev, Postgres Docker :5435, E2E server :3011 (Playwright), Vitest + Playwright

## Summary

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Vitest (unit + API) | 31 | 0 | 0 |
| Playwright (E2E) | 21 | 0 | 0 |
| Production build | 1 | 0 | — |
| ESLint | — | 11 errors (pre-existing) | — |

**Automated verdict:** All **52** runnable automated tests **passed**. Build succeeded.

---

## Vitest results (31 tests)

| File | Tests | Status |
|---|---|---|
| `lib/quiz/scoring.test.ts` | 5 | Pass |
| `lib/gemini/compliance.test.ts` | 3 | Pass |
| `lib/gemini/meal-analysis.test.ts` | 2 | Pass |
| `lib/members/uuid.test.ts` | 3 | Pass |
| `lib/api/fetch-json.test.ts` | 3 | Pass |
| `lib/auth/dev-auth-enabled.test.ts` | 4 | Pass |
| `tests/api/integration.test.ts` | 11 | Pass |

API integration includes **4 message tests** (`GET/POST /api/messages`, coach `memberId` validation, 404).

---

## Playwright E2E results (21 tests)

| Spec | Tests | Status |
|---|---|---|
| `prospect-flow.spec.ts` | 5 | Pass |
| `member-flow.spec.ts` | 7 | Pass |
| `coach-flow.spec.ts` | 6 | Pass |
| `auth-roles.spec.ts` | 3 | Pass |

E2E runs on **port 3011** via `scripts/e2e-server.mjs` (production build, Firebase cleared, `E2E_DEV_AUTH=1`). Safe to run while `npm run dev` is on **3010**.

---

## Requirements traceability

### Pass — fully implemented (automated coverage)

| TC-ID | Module | Automated result |
|---|---|---|
| TC-FM01-001 | FM-01 landing | E2E Pass |
| TC-FM01-002 | FM-01 CTA → philosophy | E2E Pass |
| TC-FM01-003 | FM-01 three pillars | E2E Pass |
| TC-FM01-005 | FM-01 snap-scroll carousel | E2E Pass |
| TC-FM01-006 | FM-01 localStorage session | Manual (localStorage) |
| TC-FM02-001 | FM-02 quiz progress | E2E Pass |
| TC-FM02-004 | FM-02 high intent → coaching | E2E Pass |
| TC-FM02-005 | FM-02 low intent → waitlist | E2E Pass |
| TC-FM02-006 | FM-02 routing logic | Unit Pass |
| TC-FM02-007 | FM-02 lead API | API Pass |
| TC-FM02-009 | FM-02 Cal.com embed | E2E Pass |
| TC-FM02-010 | FM-02 email capture | E2E Pass |
| TC-FM02-011 | FM-02 vault waitlist API | API Pass |
| TC-FM04-001 | Member dashboard | E2E Pass |
| TC-FM04-005 | Check-in AI threshold | API Pass (pending for strict Hetal targets) |
| TC-FM04-006 | Compliance scoring | Unit Pass |
| TC-FM04-010 | Coach command center | E2E Pass |
| TC-FM05-001 | Workouts from plan | E2E Pass |
| TC-FM05-004 | FM-05 video library filters | E2E Pass |
| TC-FM03-001 | Nutrition view | E2E Pass |
| TC-FM03-002 | New member empty state | E2E Pass |
| TC-FM03-010 | Plan delivery list | E2E Pass |
| TC-FM03-011–013 | FM-03 drag-drop builder | Manual (coach builder) |
| TC-COACH-001 | Members active tab | E2E Pass |
| TC-COACH-002 | Member profile | E2E Pass |
| TC-COACH-003 | Paused clients | E2E Pass |
| TC-UX-001 | Bottom nav | E2E Pass |
| TC-MSG-001 | Member messaging | E2E Pass |
| TC-MSG-002 | Coach message thread | E2E Pass |
| TC-MSG-003 | Messages API | API Pass |
| TC-AUTH-001 | Coach role guard | E2E Pass |
| TC-AUTH-002 | Member role guard | E2E Pass |
| TC-AUTH-003 | Dev personas | E2E Pass |
| TC-MILE-001 | Member profile API | API Pass |
| TC-MILE-002 | Invalid UUID → 400 | API Pass |
| TC-MILE-003 | Unauthorized → 403 | API Pass |
| TC-MILE-004 | authFetchJson safe parse | Unit Pass |
| TC-MILE-006 | AI threshold logic | Unit + API Pass |

### Partial — known BRD gaps (not test failures)

| TC-ID | Requirement | Status | Notes |
|---|---|---|---|
| TC-FM01-005 | WebP hero imagery | Partial | SVG placeholders used instead of WebP binaries |
| TC-FM02-008 | Coach enquiries tab | Partial | Leads API works; dedicated E2E not added |
| TC-FM03-014 | Pilot timer | Partial | Manual verification |
| TC-FM04-011 | Approve/flag workflow | Partial | Manual |
| TC-FM05-002–003 | Video playback | Partial | List/filter wired; playback manual |
| TC-FM06-001–002 | FM-06 checkout/waitlist UI | Deferred | Checkout excluded; waitlist API implemented |
| TC-PWA-001 | Offline PWA shell | Deferred | Explicitly out of scope |
| TC-UX-002–003 | Thumb-zone / colors | Partial | Manual checklist |
| TC-MILE-005 | Tenant isolation | Partial | Single tenant in dev seed |

---

## Action items

### Regressions (none)

No automated test failures against current codebase.

### Pre-existing lint (not introduced by PRD gap work)

ESLint reports 11 `react-hooks/set-state-in-effect` errors in existing app code. These predate the test suite and do not block build or tests.

### Remaining follow-ups (out of scope or Phase 2)

1. **FM-06:** Stripe/Razorpay checkout flow.
2. **PWA:** Service worker for offline shell.
3. **FM-02:** Coach enquiries E2E coverage.
4. **FM-01:** Replace SVG placeholders with WebP hero assets if required.

---

## How to re-run

```powershell
docker compose up -d
cd web
npm run db:push
npm run db:seed
npm run test
npm run test:e2e
npm run build
```

Full scenario matrix: [`docs/test-scenarios.md`](test-scenarios.md)

Production staging: [https://abstrack.duckdns.org](https://abstrack.duckdns.org) — redeploy with `deploy\redeploy.bat`.
