# Test results (latest)

**Date:** 2026-07-26  
**Vitest:** 119 passed (27 files) — includes appointments, PDF how-to guide API, create-pdf-document  
**Scope:** coach nav, calendar/booking, plan delivery tabs, PDF download fix, Montserrat typography

```powershell
cd web
npm run test
```

E2E (optional, port 3011):

```powershell
npm run test:e2e
```

New coverage in this batch:

- `lib/pdf/create-pdf-document.test.ts` — pdfkit loads via Node require
- `tests/api/integration.test.ts` — `GET /api/coach/user-guide` (coach PDF + member 403)
- `tests/e2e/coach-flow.spec.ts` — top nav, plan delivery tabs, how-to guide download
