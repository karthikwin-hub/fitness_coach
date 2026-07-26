# Test results (latest)

**Date:** 2026-07-26  
**Vitest:** 132 passed — coach assignment, program journey windows, appointment booking, journey APIs  
**Scope:** calendar 403 fix, block UX, coach/member journey, progress roster

```powershell
cd web
npm run test
```

E2E (optional, port 3011):

```powershell
npm run test:e2e
```

New coverage in this batch:

- `lib/members/program-journey.test.ts` — 90-day window math and navigation
- `lib/members/coach-access.test.ts` — coach/member access rules
- `tests/api/integration.test.ts` — coach appointment booking, journey APIs, progress roster
- `tests/e2e/coach-flow.spec.ts` — Progress tab, journey page, appointment API
- `tests/e2e/member-flow.spec.ts` — `/member/progress` page and nav
