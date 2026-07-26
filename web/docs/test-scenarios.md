# Abs-Track Test Scenarios

Requirements traceability for implemented features. Sources: agreed plan (`.cursor/plans/fitness_coach_platform_56a864c9.plan.md`), BRD/UI spec summaries in that plan.

**Legend:** Type = `E2E` (Playwright), `API` (Vitest integration), `Unit` (Vitest), `Manual` (human verification).  
**Expected status:** `Pass` = fully implemented, `Partial` = known gap vs BRD, `Deferred` = Phase 2 / not built.

---

## Flow A — Prospect discovery (FM-01, FM-02)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-FM01-001 | FM-01, Flow A step 1 | Prospect | None | Open `/` | Abs-Track brand, tagline, coaching + programs CTAs | E2E | P0 | Pass |
| TC-FM01-002 | FM-01, Flow A step 1 | Prospect | On `/` | Click "Find Your Fitness Path" | Navigate to `/philosophy` | E2E | P0 | Pass |
| TC-FM01-003 | FM-01, 3 pillars | Prospect | On `/philosophy` | Read page | Nutrition First, Sustainable Movement, Data-Driven Accountability | E2E | P0 | Pass |
| TC-FM01-004 | FM-01, CTA to quiz | Prospect | On `/philosophy` | Click quiz link | Navigate to `/quiz` | E2E | P0 | Pass |
| TC-FM01-005 | FM-01 swipe/WebP | Prospect | On `/philosophy` | Inspect UI | Snap-scroll carousel, WebP hero imagery | Manual | P1 | Partial |
| TC-FM01-006 | FM-01 localStorage | Prospect | Complete philosophy | Refresh | Session progress persisted | Manual | P2 | Partial |
| TC-FM02-001 | FM-02, 5 steps | Prospect | On `/quiz` | Start quiz | Progress bar, "Step 1 of 5", virtual guide header | E2E | P0 | Pass |
| TC-FM02-002 | FM-02 questions | Prospect | On `/quiz` | Advance steps | goal, bottleneck, diet, location, commitment questions | E2E | P0 | Pass |
| TC-FM02-003 | FM-02 location | Prospect | Location step | View options | India, US, Australia, Other | E2E | P0 | Pass |
| TC-FM02-004 | FM-02 high intent | Prospect | Quiz answers | Select high commitment + complete | Outcome: coaching, "Book with Helna" | E2E | P0 | Pass |
| TC-FM02-005 | FM-02 low intent | Prospect | Quiz answers | Select low commitment + complete | Outcome: waitlist message | E2E | P0 | Pass |
| TC-FM02-006 | FM-02 routing logic | System | None | Unit test scoreIntent/routeQuizOutcome | Medium + score≥50 → coaching | Unit | P0 | Pass |
| TC-FM02-007 | FM-02 lead API | System | DB seeded | POST `/api/leads` | Lead persisted with intentScore, routedTo | API | P0 | Pass |
| TC-FM02-008 | FM-02 coach view | Coach | Lead submitted | Open `/coach/members` → New enquiries | Quiz lead visible with intent score | E2E | P0 | Pass |
| TC-FM02-009 | FM-02 Cal.com embed | Prospect | High intent outcome | Inspect booking UI | Cal.com iframe embed (not external link only) | Manual | P1 | Partial |
| TC-FM02-010 | FM-02 email capture | Prospect | Quiz complete | Check form | Email collected before submit | Manual | P1 | Partial |
| TC-FM06-001 | FM-06 waitlist | Prospect | Low intent outcome | Complete quiz | Waitlist copy shown; no checkout | E2E | P2 | Deferred |
| TC-FM06-002 | FM-06 vault DB | System | Low intent | Check DB | Row in `vault_waitlist` | API | P1 | Pass |
| TC-VAULT-001 | Vault catalog | Prospect | DB seeded | GET `/api/vault/catalog?tenantSlug=abstrack` | ≥6 published families with SKUs | API | P0 | Pass |
| TC-VAULT-002 | Vault detail | Prospect | DB seeded | GET `/api/vault/families/sustainable-weight-loss` | Program detail + heroJson | API | P0 | Pass |
| TC-VAULT-003 | Vault storefront UI | Prospect | Dev server | Open `/programs` | Hero, testimonials, press, 6 program cards | Manual | P0 | Pass |
| TC-VAULT-004 | Vault waitlist CTA | Prospect | On `/vault/[slug]` | Submit email on Buy Now | Row in `vault_waitlist` with location slug | API | P1 | Pass |
| TC-VAULT-005 | Coach vault admin | Coach | Dev coach login | Open `/coach/vault` | Edit pricing, storefront copy | Manual | P1 | Pass |
| TC-VAULT-006 | Coach catalog settings | Coach | DB seeded | GET `/api/coach/vault/catalog-settings` | Marketing JSON with hero + testimonials | API | P0 | Pass |
| TC-VAULT-007 | Vault checkout | Prospect | On product page | Click Buy Now | Stripe/Razorpay checkout | E2E | P2 | Deferred |

---

## Flow B — Active client (Member PWA, FM-04, FM-05)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-FM04-001 | Flow B dashboard | Member | Dev login as Demo Member | Open `/member` | Greeting, streak, compliance % | E2E | P0 | Pass |
| TC-FM04-002 | Flow B check-in CTA | Member | On dashboard | Find CTA | Link to check-in | E2E | P0 | Pass |
| TC-FM04-003 | Flow B check-in form | Member | On `/member/check-in` | View form | Energy/soreness sliders, weight, sleep | E2E | P0 | Pass |
| TC-FM04-004 | FM-04 submit check-in | Member | Logged in | Submit check-in without photo | Success state shown | API | P0 | Pass |
| TC-FM04-005 | FM-04 AI stub approve | Member | GEMINI unset | POST check-in with mealPhotoUrl | status approved when confidence ≥ 0.85 | API | P0 | Pass |
| TC-FM04-006 | FM-04 compliance score | System | None | Unit test scoreCompliance | Flags when macros out of range | Unit | P0 | Pass |
| TC-FM04-007 | FM-04 coach feedback | Member | Coach noted check-in | Open `/member` dashboard | Coach feedback section visible | E2E | P1 | Pass |
| TC-FM05-001 | FM-05 workout plan | Member | Published training plan | Open `/member/workouts` | Today's exercises listed | E2E | P0 | Pass |
| TC-FM05-002 | FM-05 YouTube embed | Member | Exercise with video | Open workout | YouTube player present | E2E | P0 | Pass |
| TC-FM05-003 | FM-05 set tracker | Member | On workout | Toggle set checkboxes | Checkboxes interactive | E2E | P0 | Pass |
| TC-FM05-005 | FM-05 set persistence | Member | Exercise with sets selected | Toggle set 1 → reload page | Set 1 still checked | E2E | P0 | Pass |
| TC-FM05-004 | FM-05 filter vault | Member | On workouts | Look for Chest/Legs/Core tabs | Filter tabs browse all videos | Manual | P1 | Partial |
| TC-FM03-001 | FM-03 nutrition + food diary | Member | Published nutrition or empty | Open `/member/nutrition` | Meal sections (Breakfast–Snack), + Add, macro totals | E2E | P0 | Pass |
| TC-FM03-003 | FM-03 search and log food | Member | On nutrition | + Add → search "chicken" → pick result | Entry appears with calories | E2E | P0 | Pass |
| TC-FM03-004 | FM-03 manual food entry | Member | On nutrition | + Add → Manual tab → enter macros | Entry saved to diary | Manual | P1 | Pass |
| TC-FM03-005 | FM-03 remove diary entry | Member | Logged food | Click Remove on entry | Entry removed; totals update | Manual | P1 | Pass |
| TC-FM03-006 | FM-03 photo log via nutrition | Member | On nutrition | + Add → Photo tab → analyze | Gemini stub creates diary entry | Manual | P1 | Pass |
| TC-FM03-007 | FM-03 check-in add to diary | Member | Check-in with photo | After submit → Add to food diary | Entry in today's diary | Manual | P1 | Pass |
| TC-FM03-002 | FM-03 new member empty | Member | Priya (no plans) | Open nutrition/workouts | Empty state, no crash | E2E | P0 | Pass |
| TC-UX-001 | UI spec bottom nav | Member | On `/member` | View nav | Dashboard, Workouts, Nutrition, Messages | E2E | P0 | Pass |
| TC-UX-002 | UI spec thumb zone | Member | Mobile 375px | Check check-in page | Primary actions in bottom third | Manual | P1 | Partial |
| TC-UX-003 | Branding colors | Member | Nutrition vs workout | Compare pages | Green diet / teal workout accents | Manual | P1 | Pass |
| TC-PWA-001 | PWA offline | Member | Install PWA | Go offline | Cached shell works | Manual | P2 | Partial |
| TC-MSG-001 | Messaging | Member | On `/member/messages` | Open page | Chat thread with compose + Send | E2E | P1 | Pass |
| TC-MSG-002 | Messaging | Coach | Demo member profile | Open Messages section | Seeded thread visible | E2E | P1 | Pass |

---

## Flow C — Coach command center (FM-03, FM-04)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-FM04-010 | Flow C command center | Coach | Dev login as Coach | Open `/coach` | Check-in review list | E2E | P0 | Pass |
| TC-FM04-011 | Flow C approve/flag | Coach | Pending check-in | Approve or flag | Status updates | Manual | P1 | Pass |
| TC-FM03-010 | FM-03 plan list | Coach | On `/coach/plans` | View clients | Active members listed | E2E | P0 | Pass |
| TC-FM03-011 | FM-03 training builder | Coach | Select client | Open training builder | Week days, exercises editable | Manual | P1 | Pass |
| TC-FM03-012 | FM-03 publish | Coach | Plan edited | Publish | Member sees updated plan | Manual | P1 | Pass |
| TC-FM03-013 | FM-03 drag-drop | Coach | In builder | Reorder blocks | Drag-drop reorder | Manual | P2 | Partial |
| TC-FM03-014 | FM-03 pilot timer | Coach | On `/coach/pilot` | View metrics | Publish duration tracking | Manual | P1 | Pass |
| TC-COACH-001 | Members list | Coach | On `/coach/members` | View Active tab | Seeded clients (Hetal, Avinash, etc.) | E2E | P0 | Pass |
| TC-COACH-002 | Member profile | Coach | On members list | Click Avinash Mehta | Profile loads (not "Member not found") | E2E | P0 | Pass |
| TC-COACH-003 | Paused clients | Coach | Members tab | Open Paused | Former Client (paused) shown | E2E | P1 | Pass |
| TC-COACH-004 | Content blocks | Coach | On `/coach/content-blocks` | View list | Seeded blocks visible | Manual | P1 | Pass |
| TC-COACH-005 | Exercise catalog | Coach | On `/coach/exercises` | View list | Exercises with YouTube IDs | Manual | P1 | Pass |
| TC-COACH-006 | Coach sees member diary | Coach | Member logged food today | Open member profile | Today's food diary totals visible | E2E | P1 | Pass |
| TC-COACH-007 | Exercise edit UI | Coach | On `/coach/exercises` | Expand row → edit name/reps → Save | Changes persist after reload | Manual | P1 | Pass |
| TC-COACH-008 | Exercise delete | Coach | On `/coach/exercises` | Expand → Delete → confirm | Removed from catalog | Manual | P2 | Pass |
| TC-COACH-009 | Save before publish (training) | Coach | Training builder | Edit → Save & publish | Structure saved then published | Manual | P1 | Pass |
| TC-COACH-010 | Save before publish (nutrition) | Coach | Nutrition builder | Edit → Save & publish | Plan saved then published | Manual | P1 | Pass |
| TC-COACH-011 | Nutrition create week 1 | Coach | Member with no nutrition plan | Empty state → + Create week 1 | Week 1 draft created | Manual | P1 | Pass |
| TC-COACH-012 | Training guideline blocks | Coach | Training builder | Attach workout guideline block | Block saved; member sees on workout | Manual | P1 | Pass |

---

## Batch — Plan delivery + templates (July 2026)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-DEL-001 | Template vars resolve | System | None | `resolveTemplateString` with `client_name` | Substitutes; throws if leftover `{{x}}` | Unit | P0 | Pass |
| TC-DEL-002 | PDF-safe text | System | None | `toPdfSafeText("≤150 — rest")` | `<=150 - rest` | Unit | P0 | Pass |
| TC-DEL-003 | Member health block | System | None | `buildHealthConsiderationsBlock` for Avinash | Title includes Avinash; not "Hetal Focus" | Unit | P0 | Pass |
| TC-DEL-004 | Template resolve days | System | Catalog map | `resolveTemplateDays(GYM_W1)` | Days resolved; missing slug throws | Unit | P0 | Pass |
| TC-DEL-005 | Delivery tokens | System | None | Hash / resolve token helpers | Token hash stable; resolve never returns AuthUser | Unit | P0 | Pass |
| TC-DEL-006 | Plan pack PDF | System | Snapshot fixture | `renderPlanPackPdf` | Buffer starts with `%PDF` | Unit | P0 | Pass |
| TC-DEL-007 | Grocery table in PDF | System | Snapshot with `grocery_list` categories | Render plan pack | Non-empty PDF (4-column table path) | Unit | P0 | Pass |
| TC-DEL-008 | Coach how-to PDF | System | None | `renderCoachHowtoGuidePdf` | Buffer starts with `%PDF` | Unit | P0 | Pass |
| TC-DEL-010 | Create delivery | Coach | Published plans + DB | POST `/api/plan-deliveries` | Delivery + token URLs; snapshot stored | API | P0 | Pass |
| TC-DEL-011 | Public PDF via token | Anyone | Active delivery | GET `/p/{token}/plan.pdf` | PDF bytes; welcome text resolved | API | P0 | Pass |
| TC-DEL-012 | Revoke delivery | Coach | Active delivery | PATCH revoke | Token no longer serves PDF | API | P1 | Pass |
| TC-DEL-013 | Coach how-to download | Coach | Signed in | GET `/api/coach/user-guide` | PDF attachment | Manual | P0 | Pass |
| TC-DEL-014 | Member blocked from guide | Member | Signed in | GET `/api/coach/user-guide` | 403 Forbidden | Manual | P0 | Pass |
| TC-DEL-015 | From-template gym/home | Coach | Seeded catalog | POST `/api/training-plans/from-template` | Full week created; missing exercise → 400 | Manual | P0 | Pass |
| TC-DEL-016 | Prepare delivery UI | Coach | Published plans | Plan hub → Prepare delivery → Preview | PDF opens; grocery on one page | Manual | P0 | Pass |
| TC-DEL-017 | Member new-plan banner | Member | Fresh delivery | Open `/member` | Banner + PDF download available | Manual | P1 | Pass |

---

## Batch — Nutrition tracking API (July 2026)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-NUTR-001 | Food diary CRUD | Member | DB + schema pushed | POST manual entry → GET diary | Entry in list; totals ≥ entry calories | API | P0 | Pass |
| TC-NUTR-002 | Food diary delete | Member | Entry exists | DELETE `/api/members/me/food-diary/[id]` | 200; entry gone | API | P0 | Pass |
| TC-NUTR-003 | Invalid mealType | Member | None | POST with mealType `brunch` | 400 Invalid mealType | API | P0 | Pass |
| TC-NUTR-010 | Food search stub | Member | NUTRITIONIX unset | GET `/api/foods/search?q=chicken` | Dev stub results include chicken | API | P0 | Pass |
| TC-NUTR-011 | Food search short query | Member | None | GET `?q=a` | Empty results array | API | P0 | Pass |
| TC-NUTR-012 | Barcode stub | Member | NUTRITIONIX unset | GET `/api/foods/barcode?upc=123` | Dev packaged item result | API | P1 | Pass |
| TC-NUTR-020 | Coach diary read | Coach | Demo member | GET `/api/members/{id}/food-diary` | 200 + logDate, totals, entries | API | P0 | Pass |
| TC-NUTR-030 | Diary totals unit | System | None | Vitest computeMacroTotals | Sums calories/macros correctly | Unit | P0 | Pass |
| TC-NUTR-031 | Daily compliance unit | System | None | Vitest scoreDailyCompliance | Flags high carbs vs targets | Unit | P0 | Pass |
| TC-NUTR-032 | Food provider stub unit | System | None | Vitest searchFoods("chicken") | Returns dev foods | Unit | P0 | Pass |

---

## Batch — Workout set completion API (July 2026)

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-WK-001 | Get set completions | Member | Published plan + DB | GET `/api/members/me/workout-sets?date=YYYY-MM-DD` | `{ workoutDate, completions[] }` | API | P0 | Pass |
| TC-WK-002 | Mark set complete | Member | Exercise in today's plan | PUT `{ exerciseId, setNumber, completed: true }` | 200; GET shows completion | API | P0 | Pass |
| TC-WK-003 | Unmark set | Member | Set completed | PUT `completed: false` | Completion removed | API | P1 | Pass |
| TC-WK-004 | Forbidden for coach | Coach | None | GET workout-sets as coach token | 403 Forbidden | API | P1 | Pass |

---

## UX Review Response Plan — verification (Deferred until built)

Source: [`.cursor/plans/ux_review_response_plan_ed009e6d.plan.md`](../.cursor/plans/ux_review_response_plan_ed009e6d.plan.md). Run after Phase 0–3 implementation.

### Phase 0 — Content alignment

| ID | Feature | Steps | Expected result | Type | Expected status |
|---|---|---|---|---|---|
| TC-UXP0-001 | Abs-Track diary primary copy | Read success-strategies content block | Leads with in-app nutrition logging | Manual | Deferred |
| TC-UXP0-002 | MFP optional mention | Read nutrition tips block | MFP mentioned as optional only | Manual | Deferred |
| TC-UXP0-003 | Copy bible wired | Empty check-in queue (coach) | Helna-voice string, not generic SaaS | Manual | Deferred |

### Phase 1 — Foundation

| ID | Feature | Steps | Expected result | Type | Expected status |
|---|---|---|---|---|---|
| TC-UXP1-001 | Branding dual mode | Coach settings → Dual accent | Workout + diet colors apply portal-wide | Manual | Deferred |
| TC-UXP1-002 | Branding single mode | Coach settings → Single accent | One primary color; derived secondary | Manual | Deferred |
| TC-UXP1-003 | Editorial typography | Open `/coach` | Display serif on major headings | Manual | Deferred |
| TC-UXP1-004 | Member typography | Open `/member` | Montserrat only; no serif | Manual | Deferred |
| TC-UXP1-005 | Approve animation | Approve check-in | Card slide-out + green accent (Framer, coach only) | E2E | Deferred |
| TC-UXP1-006 | Focus glow | Tab into coach form field | Brand-colored focus ring | Manual | Deferred |
| TC-UXP1-007 | Member bundle | Build analyze / Lighthouse | No framer-motion on member routes | Manual | Deferred |

### Phase 2 — Coach command center

| ID | Feature | Steps | Expected result | Type | Expected status |
|---|---|---|---|---|---|
| TC-UXP2-001 | Sparklines in queue | View check-in list | Weight/sleep sparkline per row | Manual | Deferred |
| TC-UXP2-002 | Trend alert sleep | Member 3-day sleep decline | "At risk" badge on command center | Manual | Deferred |
| TC-UXP2-003 | Trend alert protein | 4/7 days low protein | Flag on member list | Manual | Deferred |
| TC-UXP2-004 | Recipe quick-fix drawer | Flagged check-in → open drawer | Coach recipes; append recommendation | Manual | Deferred |
| TC-UXP2-005 | Inline diary in review | Select check-in | Today's diary totals in panel | E2E | Deferred |

### Phase 3 — Member experience

| ID | Feature | Steps | Expected result | Type | Expected status |
|---|---|---|---|---|---|
| TC-UXP3-001 | Optional coach note | Helna posts note | Pinned card on member dashboard | E2E | Deferred |
| TC-UXP3-002 | No note empty state | No active note | Dashboard has no empty note placeholder | E2E | Deferred |
| TC-UXP3-003 | Program phase strip | Member with program dates | Phase strip shows current phase | E2E | Deferred |
| TC-UXP3-004 | Streak toast CSS | Hit 7-day streak | CSS-only toast + copy-bible message | E2E | Deferred |
| TC-UXP3-005 | Coach note audio | Note with audio attachment | Player works on dashboard | Manual | Deferred |

---

## Cross-cutting — Auth, API, milestones

| ID | Requirement ref | Persona | Preconditions | Steps | Expected result | Type | Priority | Expected status |
|---|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | Auth roles | Coach | Logged in as coach | Navigate to `/member` | Redirect to `/coach` | E2E | P0 | Pass |
| TC-AUTH-002 | Auth roles | Member | Logged in as member | Navigate to `/coach` | Redirect to `/member` | E2E | P0 | Pass |
| TC-AUTH-003 | Dev personas | Any | On `/login?switch=1` | View picker | 6 dev persona buttons (skipped when Firebase configured on test server) | E2E | P0 | Pass |
| TC-AUTH-004 | Persona switch | Any | Signed in (dev) | Use Switch persona in header | Returns to login picker | E2E | P1 | Pass |
| TC-AUTH-005 | Member sign out | Member | Firebase configured (prod) | Click Sign out in header | Redirect to `/login`; session cleared | Manual | P0 | Pass |
| TC-AUTH-006 | Coach sign out | Coach | Firebase configured (prod) | Sign out on command center | Redirect to `/login` | Manual | P1 | Pass |
| TC-MILE-001 | Member profile API | Coach | DB seeded | GET `/api/members/{validId}` | 200 + profile JSON | API | P0 | Pass |
| TC-MILE-002 | Invalid member id | Coach | None | GET `/api/members/undefined` | 400 Invalid member id | API | P0 | Pass |
| TC-MILE-003 | Unauthorized API | None | No auth header | GET `/api/members` | 403 Forbidden | API | P0 | Pass |
| TC-MILE-004 | authFetchJson | Client | None | Unit test empty body | No throw; returns error | Unit | P0 | Pass |
| TC-MILE-005 | Tenant isolation | System | Two tenants | Cross-tenant API read | 404 / no data leak | Manual | P1 | Partial |
| TC-MILE-006 | AI threshold 85% | System | Seed tenant | Check-in with stub | Auto-approve at ≥0.85 | API | P0 | Pass |
| TC-BRAND-001 | Abs-Track branding | Prospect | On `/` | Inspect fonts/colors | Montserrat, dark #1E1E1E, brand vars | Manual | P1 | Pass |

---

## Manual UX checklist (not automated)

Run at **375px** viewport unless noted.

- [ ] TC-FM01-005: Snap-scroll / WebP — **Partial (not built)**
- [ ] TC-FM02-009: Cal.com embed vs link — **Partial (external link)**
- [ ] TC-FM02-010: Email capture — **Partial (not in UI)**
- [ ] TC-FM03-004–007: Manual/photo diary flows
- [ ] TC-FM03-013: Drag-drop plan builder — **Partial**
- [ ] TC-FM05-004: Video filter tabs — **Partial (component unwired)**
- [ ] TC-FM05-005: Set checkbox persistence after reload
- [ ] TC-UX-002: Thumb-zone CTAs on check-in
- [ ] TC-UX-003: Green nutrition / teal workout color semantics
- [ ] TC-PWA-001: Offline shell — **Partial (no service worker)**
- [ ] TC-BRAND-001: Montserrat + Abs-Track palette
- [ ] TC-AUTH-005–006: Sign out on production (Firebase)
- [ ] TC-COACH-007–012: Coach batch features (edit exercise, save & publish, week 1, guidelines)
- [ ] TC-UXP0-* through TC-UXP3-*: UX review plan — **Deferred until phases built**

---

## Automated tests to add (agent mode — not yet in repo)

When switching out of plan mode, implement these files:

| File | Covers |
|------|--------|
| `tests/api/nutrition-diary.test.ts` | TC-NUTR-001–003, TC-NUTR-010–011, TC-NUTR-020 |
| `tests/api/workout-sets.test.ts` | TC-WK-001–004 |
| `tests/e2e/batch-features.spec.ts` | TC-FM05-005, TC-AUTH-004, TC-COACH-006–007 |
| `lib/workouts/date.test.ts` | localWorkoutDateString |

Existing coverage: `lib/nutrition/diary.test.ts` (TC-NUTR-030–031), `lib/nutrition/food-provider.test.ts` (TC-NUTR-032), `member-flow.spec.ts` (TC-FM03-001, TC-FM03-003).

---

## Running automated tests

Prerequisites: Docker Postgres on port 5435, `npm run db:push && npm run db:seed`.

```powershell
cd web
npm run test          # Vitest (unit + API)
npm run test:e2e      # Playwright — dedicated dev server on :3011, Firebase cleared
```

Playwright builds and starts a production server on **:3011** (`scripts/e2e-server.mjs`) with Firebase cleared, so dev personas work even when `.env.local` has production Firebase keys. This runs alongside your dev server on **3010**.

To reuse an existing server (must show dev personas, not Google-only login):

```powershell
$env:PLAYWRIGHT_BASE_URL="http://localhost:3010"
$env:PLAYWRIGHT_SKIP_WEBSERVER="1"
npm run test:e2e
```

Results are recorded in `docs/test-results.md` after each run.
