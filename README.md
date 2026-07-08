# GrowEasy AI-Powered CSV Lead Importer

Upload a CSV export from *anywhere* -- Facebook Lead Ads, Google Ads, a real-estate
CRM, a sales report, or a spreadsheet someone typed by hand -- and get back clean,
validated GrowEasy CRM records. Column names and layout don't need to match
anything; an LLM does the field mapping.

```
Upload CSV → Preview (client-side, no AI yet) → Confirm → AI extraction (batched,
streamed) → Results (imported / skipped, with reasons)
```

## Monorepo layout

```
GrowEasy/
├── backend/   Express + TypeScript API: CSV parsing, AI batch extraction, validation
├── frontend/  Next.js (App Router) + TypeScript + Tailwind UI
└── docker-compose.yml
```

Each app is independently deployable and has its own README-level detail in this
file below. See `backend/.env.example` and `frontend/.env.local.example` for all
configuration.

## Quick start (local dev)

Requires Node.js 20+.

```bash
npm run install:all        # installs backend/ and frontend/ dependencies

cp backend/.env.example backend/.env
# edit backend/.env and set an API key for the provider you want to use
# (LLM_PROVIDER=anthropic|openai|gemini, or LLM_PROVIDER=mock to try the app
# with zero setup and no API key -- see "AI providers" below)

cp frontend/.env.local.example frontend/.env.local

npm run dev                 # runs backend on :4000 and frontend on :3000 together
```

Open http://localhost:3000, drop in a CSV, and walk through the flow.

Run everything from the repo root, or `cd backend` / `cd frontend` and run their
scripts individually -- both work.

## AI providers

The backend is written against a small `LLMProvider` interface
(`backend/src/services/ai/types.ts`) with four implementations, selected at
runtime via `LLM_PROVIDER`:

| Provider | Env var | Notes |
|---|---|---|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | Uses Claude tool-use for guaranteed structured JSON output. |
| `openai` | `OPENAI_API_KEY` | Uses `response_format: json_schema` (strict mode). |
| `gemini` | `GEMINI_API_KEY` | Uses `responseSchema` / `responseMimeType: application/json`. |
| `mock` | *(none)* | Deterministic keyword-based mapper. No cost, no key, no network call -- lets you (or a reviewer) try the whole upload → preview → import → results flow immediately. **Not** a substitute for the real providers' reasoning over ambiguous columns; only use it for local demos. |

Only the key for whichever provider you select is required. Switching providers
is a one-line env change -- no code changes.

## How CRM field extraction works

1. **Parse.** The backend accepts the uploaded CSV as-is (no assumptions about
   column names) and parses it into `{ headers, rows }` (`services/csv.service.ts`).
2. **Batch.** Rows are chunked (`BATCH_SIZE`, default 25) and sent to the LLM one
   batch at a time (`services/extraction.service.ts`).
3. **Extract.** Each batch is sent with a system prompt (`services/ai/prompt.ts`)
   that describes the 15 GrowEasy CRM fields, the allowed `crm_status` /
   `data_source` enums, phone/email disambiguation rules, and date-format
   requirements. The model must return exactly one structured object per input
   row, in order.
4. **Validate.** The response is parsed against a Zod schema
   (`schemas/crm.schema.ts`); enum values are matched case-insensitively, values
   outside the allowed lists are coerced to `""` rather than accepted, and stray
   JSON numbers/nulls are coerced to strings instead of failing the batch.
5. **Normalize.** Every extracted row then passes through a deterministic
   rule-enforcement pass (`services/normalize.service.ts`) that codifies the
   spec's AI instructions instead of trusting the model to have followed them:
   `created_at` is guaranteed `new Date()`-parseable (unambiguous day-first dates
   like `25/12/2026` are rescued, unusable ones moved to `crm_note`), first
   email/mobile wins with the rest appended to `crm_note`, mobiles are reduced to
   digits (with a `91` prefix split into `country_code` and `+91` inferred for
   bare 10-digit Indian mobiles), and every field is made single-line
   (`\n`-escaped) so each record stays one valid CSV row.
6. **Skip rule.** A row is moved to `skipped` if, after mapping and
   normalization, it has **neither** an email nor a mobile number -- enforced
   deterministically in code (`extraction.service.ts`), not left to the model's
   judgment, so the rule from the spec always holds regardless of what the LLM
   returns.
7. **Resilience.** If a batch's response doesn't parse, or the row count doesn't
   match the input, the batch is retried with exponential backoff
   (`BATCH_RETRY_ATTEMPTS`, default 3). If it still fails, every row in that batch
   is skipped with a clear reason instead of failing the whole import.
8. **Stream.** `POST /api/import/stream` emits one newline-delimited JSON progress
   event per completed batch, so the UI can show real progress instead of a single
   spinner -- see "Bonus features" below.

## API

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness + which `LLM_PROVIDER` is active. |
| `POST /api/import` | multipart `file` field → one JSON response with the full summary. |
| `POST /api/import/stream` | Same input, but streams `application/x-ndjson` progress events, ending in a `complete` or `error` event. Used by the frontend. |

Response shape (`ImportSummary`):

```jsonc
{
  "records": [ /* CrmRecord[] -- successfully mapped rows */ ],
  "skipped": [ /* { sourceRow, reason, raw } -- rows dropped and why */ ],
  "totalRows": 42,
  "totalImported": 39,
  "totalSkipped": 3
}
```

## CRM fields

`created_at, name, email, country_code, mobile_without_country_code, company,
city, state, country, lead_owner, crm_status, crm_note, data_source,
possession_time, description`

- `crm_status` ∈ `GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE | ""`
- `data_source` ∈ `leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots | ""`
- `created_at` is always a string parseable by `new Date(created_at)`.
- Extra emails/phone numbers beyond the first are appended to `crm_note`, not dropped.

## Bonus features implemented

- Drag & drop **and** file-picker upload
- Real per-batch progress during AI processing (streamed NDJSON, not a fake timer)
- Automatic retry with backoff for failed AI batches, with per-batch failure
  isolation (one bad batch doesn't sink the whole import)
- Virtualized results/preview tables (`@tanstack/react-virtual`) so multi-thousand
  row CSVs stay smooth, with sticky headers and independent horizontal/vertical
  scroll
- Dark mode (persisted, respects system preference on first visit)
- CSV download of the mapped CRM records from the results screen
- Unit tests for the parsing, batching, retry, skip-rule, and mock-mapping logic
- Docker setup for both services
- The `mock` provider above, so the app is demoable with no API key

## Testing

```bash
cd backend
npm test
```

49 unit tests cover CSV parsing edge cases (quoted commas/newlines, blank rows,
missing headers), the batching utility, retry/backoff behavior, the skip rule,
batch-failure isolation, the mock provider's column-keyword matching, the schema
hardening (type coercion, case-insensitive enums), and the full normalization
layer (date rescue, multi-email/mobile splitting, single-line guarantee).

For manual testing, `samples/` contains three realistic exports (Facebook-style,
real-estate CRM style, and a deliberately messy sales report with multi-phone
cells, multiple emails, day-first dates, and junk contacts) -- or use the
"Download a sample CSV" button on the app's upload screen.

## Docker

```bash
# from the repo root
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-... docker compose up --build
```

This builds and runs both services (`backend` on :4000, `frontend` on :3000,
pre-wired to talk to it). Individual images can also be built/run standalone --
see `backend/Dockerfile` and `frontend/Dockerfile`. Note that Next.js inlines
`NEXT_PUBLIC_*` vars at build time, so if you change `NEXT_PUBLIC_API_BASE_URL`
you need to rebuild the frontend image (`--build-arg NEXT_PUBLIC_API_BASE_URL=...`).

## Deploying

**Backend (Render / Railway / Fly.io, etc.):**
1. Point the platform at `backend/` as the root/service directory.
2. Build command `npm install && npm run build`, start command `npm start`.
3. Set `LLM_PROVIDER` + the matching API key, and `CORS_ORIGIN` to your deployed
   frontend's URL.

**Frontend (Vercel recommended):**
1. Point Vercel at `frontend/` as the project root.
2. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend's URL.
3. Deploy -- Next.js's defaults handle the rest.

## Design notes / trade-offs

- **Provider abstraction over a single hardcoded SDK.** The assignment allows
  any of OpenAI/Gemini/Claude; rather than guess which one a reviewer has a key
  for, the backend supports all three (plus the no-key `mock` mode) behind one
  interface, selected by env var.
- **Skip rule enforced in code, not just prompted.** The prompt asks the model
  to follow the "email or mobile required" rule, but the backend re-checks the
  model's own output before deciding what's skipped, so the rule is guaranteed
  even if the model's judgment differs from spec.
- **Streaming NDJSON instead of a job-queue/polling setup.** Batches are
  processed sequentially per request and progress is streamed on the same HTTP
  response, avoiding the complexity of a job store while still giving real
  incremental progress in the UI.
- **Frontend re-parses nothing it doesn't have to.** Step 2's preview is parsed
  once client-side (PapaParse, streaming from the `File` object) purely for
  display; the actual CSV bytes are re-sent to the backend on confirm, which
  parses and processes them independently -- matching the spec's requirement
  that "no AI processing" happens before confirmation.
