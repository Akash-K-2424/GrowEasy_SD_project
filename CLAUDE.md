# GrowEasy CSV Importer — Compliance Audit & Fix Plan

This file records a line-by-line audit of the project against the assignment spec
(`Software Developer (Intern _ Full-Time) Assignment.pdf`) and the fixes required.
Work through the ACTION ITEMS in order; mark each one done when fixed and verified.

## Audit result: requirements already met (verified in code)

| Spec requirement | Where satisfied |
|---|---|
| Upload via drag & drop AND file picker | `frontend/src/components/upload/FileDropzone.tsx` |
| Step 2 preview: parse client-side, responsive table, h+v scroll, sticky header, **no AI yet** | `frontend/src/lib/csv.ts`, `frontend/src/components/table/DataTable.tsx`, `PreviewStep.tsx` |
| Step 3: Confirm button gates the backend call | `frontend/src/hooks/useCsvImport.ts` (`confirmImport` is the only place the API is called) |
| Step 4: results table with imported records, skipped records, total imported, total skipped | `frontend/src/components/import/ResultStep.tsx` |
| Backend accepts any valid CSV, no fixed column names | `backend/src/services/csv.service.ts` (header-agnostic parse) |
| AI extraction in batches | `backend/src/services/extraction.service.ts` (`BATCH_SIZE`, default 25) |
| Returns structured JSON | `backend/src/controllers/import.controller.ts` |
| All 15 CRM fields | `backend/src/schemas/crm.schema.ts` |
| crm_status restricted to the 4 allowed values | Zod `.catch("")` + JSON-schema enum + prompt |
| data_source restricted to the 5 allowed values, blank if unsure | Same triple enforcement |
| Skip records with neither email nor mobile | `extraction.service.ts` `isSkippable()` — enforced in code, not just prompted |
| Tech stack: Next.js / Node+Express / LLM | as required |
| Bonus: progress indicators, streaming, retry w/ backoff, virtualized table, dark mode, unit tests, Docker, README | all present |

## ACTION ITEMS — gaps found (spec rules enforced only by prompt, not by code)

The evaluation criteria stress "handling messy datasets" and "production readiness".
An LLM's output cannot be trusted to follow prompt rules 100% of the time, so every
deterministic rule in the spec must ALSO be enforced in code after extraction.

- [x] **A1 (spec "AI Instructions" rule 3 — date format).** `created_at` is never
  validated. Confirmed bug: `new Date("13/05/2026")` → `Invalid Date`, and such a
  value passes straight through to the response. Fix: post-extraction normalizer —
  keep the value if `new Date()` parses it; rescue unambiguous day-first formats
  (`DD/MM/YYYY` with DD > 12) by rearranging to ISO; otherwise blank the field and
  preserve the original text in `crm_note`.
  → Fixed in `backend/src/services/normalize.service.ts` (`normalizeExtraction`).

- [x] **A2 (spec "AI Instructions" rule 6 — CSV compatibility).** No code guarantees
  each record stays a single CSV row. If the model returns a note containing a real
  newline, the exported CSV breaks the "one record = one row" rule. Fix: escape all
  `\r\n` / `\n` / `\r` inside every extracted field to the literal two characters
  `\n`, exactly as the spec suggests.
  → Fixed in `normalize.service.ts` (`toSingleLine`), applied to every field.

- [x] **A3 (spec "AI Instructions" rule 5 — multiple emails/mobiles).** "First one
  wins, rest go to crm_note" is only requested in the prompt. Fix: enforce in code —
  regex-extract all emails/phone numbers from the extracted fields; keep the first,
  append the remainder to `crm_note`; move unusable non-empty values to `crm_note`
  so the skip rule stays honest; normalize the kept mobile to digits only, split an
  unambiguous `91` prefix out of 12-digit numbers, and infer `+91` for bare
  10-digit Indian mobiles (starting 6-9) when `country_code` is empty — mirroring
  the prompt's own rule.
  → Fixed in `normalize.service.ts`, wired into `extraction.service.ts` before the
  skip check. NOTE (found during browser verification): the mock provider used to
  concatenate multi-phone cells and could mistake dates for phone numbers via its
  whole-row scan; it now passes the raw phone cell through and defers all phone
  logic to the normalizer.

- [x] **A4 (robustness — batch-level failure amplification).** If the LLM returns a
  number or null for any string field (e.g. phone as JSON number), Zod rejects the
  WHOLE batch, burning all retries on a trivial type issue. Fix: coerce null/undefined
  to `""` and numbers to strings before validation.
  → Fixed in `crm.schema.ts` (`looseString` preprocess).

- [x] **A5 (robustness — enum case sensitivity).** A model answer of `"sale_done"` or
  `"Eden_Park"` is currently discarded to `""` by `.catch("")` even though the intent
  is unambiguous. Fix: uppercase `crm_status` / lowercase `data_source` before enum
  validation.
  → Fixed in `crm.schema.ts` (preprocess on both enum fields).

- [x] **A6 (reviewer experience).** No sample CSVs to test with, though the GrowEasy
  product screenshot in the spec shows a "Download Sample CSV Template" affordance.
  Fix: add `samples/` with three realistic exports (Facebook-style, real-estate CRM
  style, deliberately messy) and a "Download sample CSV" button on the upload step.
  → Fixed: `samples/*.csv` + button in `frontend/src/components/import/UploadStep.tsx`.

## Pre-submission QA round (production builds, real browser)

A full QA pass was run against the production builds (`node dist/index.js` +
Next standalone `server.js`) with a 23-check Playwright suite: all three sample
CSVs end-to-end, non-CSV/headers-only error paths, a 200-row file (virtualized
preview, 198 imported / 2 skipped, downloaded CRM CSV re-validated), mobile /
tablet / desktop in light + dark, theme persistence, and a backend-down drill.
Issues found and fixed during that round:

- Mock provider stole the lead OWNER's email via its whole-row scan when the
  lead's email cell was empty, so a contactless row wasn't skipped; it also
  missed plain "Contact"-named phone columns. Fixed: row-scan only when no
  email-ish column exists; multiple phone/email columns are joined so the
  normalizer keeps the first and notes the rest (regression tests added).
- A failed import (e.g. backend unreachable) silently returned the user to the
  preview step with no message. Fixed: `PreviewStep` now shows an ErrorBanner
  ("Import failed: ... your file is still here, try again").
- `next start` is incompatible with `output: "standalone"` in Next 16, and the
  standalone output nested under `frontend/` because Next inferred the repo root
  from the root lockfile. Fixed: `outputFileTracingRoot` pinned in
  `next.config.ts`; run production locally with `node .next/standalone/server.js`
  (after copying `.next/static` in, as the Dockerfile does).
- Polish: custom favicon (`src/app/icon.svg`) instead of the default Next one,
  removed unused create-next-app template SVGs, cleaned a string-building hack in
  `ProcessingStep`.

## Verification checklist (run after any change)

```bash
cd backend  && npx tsc --noEmit && npm test        # all unit tests must pass
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

Then exercise the real flow: start both servers (`npm run dev` at repo root; use
`LLM_PROVIDER=mock` if no API key) and walk a CSV from `samples/` through
upload → preview → confirm → results in the browser.

## Conventions for future work

- Every deterministic rule from the spec lives in code (`normalize.service.ts`,
  `extraction.service.ts`), never only in the prompt. The prompt is guidance;
  the code is the guarantee.
- Frontend types in `frontend/src/lib/types.ts` mirror `backend/src/schemas/crm.schema.ts`
  and must be kept in sync manually.
- New backend logic requires unit tests in `backend/tests/`.
