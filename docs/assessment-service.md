# Teso assessment service

This milestone extends the existing FastAPI and Next.js applications. Python owns
assessment content, grading, statistics, and durable analysis jobs in Neon
PostgreSQL. Neon Auth resolves student identity in Next.js. The existing Supabase
SDK remains the storage provider; assessment media requires a **separate private
bucket**, not the template's public `app-storage` bucket.

The supplied local credentials have been configured in ignored `Agentic/.env` and
`frontend/.env.local`. No credentials belong in source control or `NEXT_PUBLIC_`
variables. `Agentic/.env.example` documents the Python settings.
The API and worker can be deployed independently of Next.js; see the
[separate hosting guide](separate-hosting.md).

## Setup and startup (PowerShell)

From the repository root:

```powershell
cd Agentic
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
# For a new checkout, merge .env.example into .env; preserve existing settings.
# Use DATABASE_URL for Neon. SQLite is an explicit local development alternative.
.\.venv\Scripts\python.exe -m app.assessment.cli migrate
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-development.json
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd Agentic
.\.venv\Scripts\python.exe -m app.assessment.worker
```

In a third terminal:

```powershell
cd frontend
npm ci
# On a new checkout, copy .env.local.example to .env.local and fill settings.
npm run dev
```

Open `http://localhost:3000/exams/self-assessment`. The homepage links to Exams,
then to self-assessment and available papers. Save a draft, complete the paper,
submit, and reopen the saved result using its `?session=...` URL or the saved
assessments list. Analysis is polled while queued/processing. Scores and base
explanations remain available if analysis fails.

`npm run dev` at the root still starts the existing web/API apps; run
`npm run dev:worker` separately for analysis.

## Authentication

Set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` in the frontend. Sign-in
and student sign-up use the installed Neon Auth SDK and its server route handler.
Configure email verification and allowed app origins in Neon before using real
accounts. Existing identities are used; no teacher/admin workflow was added.

Generate a random `ASSESSMENT_BRIDGE_SECRET` of at least 32 characters and set the
same value in both server environment files. Next.js obtains the user through
`getSession()`, then sends a 60-second HMAC assertion bound to the HTTP method,
path, and SHA-256 body digest. Python rejects client-supplied student IDs, scores,
answer keys, and unsupported fields. All session reads/writes check ownership.
Use HTTPS/private service networking outside local development.

For the development fixture, explicitly enable `TESO_DEMO_MODE=true` in Next.js
and `ENVIRONMENT=development`, `ALLOW_DEVELOPMENT_CONTENT=true` in Python. The
demo endpoint issues a random signed HttpOnly identity cookie. It cannot be used
in production mode and does not let the browser choose an identity. The fixture
is hidden from ordinary student accounts, is labelled **not expert reviewed**,
and all demo responses are excluded from population statistics. No real student
histories or population data are imported.

## AI/ML API configuration

Set these **only in Agentic/.env**:

```dotenv
AI_PROVIDER=aimlapi
AI_API_KEY=your-server-only-key
AI_BASE_URL=https://api.aimlapi.com/v1
AI_MODEL=gpt-4o-mini
AI_VISION_ENABLED=true
AI_REQUEST_TIMEOUT_SECONDS=30
AI_MAX_OUTPUT_TOKENS=1200
AI_MAX_RETRIES=3
JOB_LEASE_SECONDS=180
```

The adapter uses the provider's documented REST interface, Bearer authentication,
`POST /v1/chat/completions`, and strict `response_format.json_schema` output.
Documentation: [quickstart](https://docs.aimlapi.com/quickstart/simple-model),
[model and structured output](https://docs.aimlapi.com/api-references/text-models-llm/openai/gpt-4o-mini),
[vision](https://docs.aimlapi.com/capabilities/image-to-text-vision).
The old supplied quickstart URL has moved.

`AI_PROVIDER=mock` explicitly selects local feedback based on the reviewed base
explanation and labels it `mock`. Live failures are never labelled mock. Unknown
references, mismatched answer/concept IDs, unsupported misconceptions, numeric
result/unit mismatches, invalid JSON, contradictions or insufficient evidence
cause an explicit `reviewed_fallback`. Feedback for unanswered questions never
asserts a misconception. No misconception mappings exist yet, so that field is
null. Preferred feedback language supports `en`, `si`, `ta`; reviewed fallbacks
retain the source content language and are labelled accordingly.

Source content is evidence, never executable instructions. No embeddings, web
browsing, model training, BKT, FSRS or adaptive practice were added. Semantic
correctness of all free-text reasoning cannot be proved by a JSON schema; the
MVP validates IDs, explicit numeric results and units, and model contradiction
flags. Human content review remains required.

Verify the configured provider without printing credentials:

```powershell
cd Agentic
.\.venv\Scripts\python.exe -m app.assessment.cli smoke
```

The smoke command prints only provider/model, validation status, safe failure
codes, and token counts. A true `live` value means a validated live response;
mock output is explicitly marked false.

## Database and content ownership

There was no existing assessment schema or migration framework. The initial
additive migration is `Agentic/migrations/001_assessments.sql`, derived from
`app/assessment/db.py` by `python -m app.assessment.cli ddl`. The CLI `migrate`
applies this initial schema idempotently and records version 1, using a PostgreSQL
advisory lock. It does not reset databases, change existing template tables, or
modify Neon-managed auth tables. Subsequent schema changes must use new explicit
migrations rather than treating `create_all` as an upgrade system. Never execute
the raw initial SQL again against an existing schema; use the CLI.

Assessment tables have foreign keys for student/session ownership, presented
question membership, option membership and approved keys, a primary key preventing
duplicate answers, a unique session/job association, and worker/statistics indexes.
RLS is enabled with no browser policies; PUBLIC privileges are revoked. Use the
table-owning backend role (or a deliberately configured server role with equivalent
access), never the browser/Data API, for this schema.

Question, resource, media and paper version IDs are immutable through the importer.
Republishing changes requires new IDs. Session composition points at the published
question versions, preserving completed assessments. Final answer rows preserve
selection, correctness, marks, timestamps and nullable behavioural evidence;
activity type is stored on the session. Timing and hint/solution exposure are null
when unavailable. The browser's optional `active_duration_ms` is observational
and never used to award marks.

The development JSON fixture contains three original sample Physics questions.
It does not claim expert approval. Team-reviewed production packages must set
`review_status=reviewed` and `is_development=false`. The strict `Package` schema
in `content.py` validates unique IDs, complete paper membership, positive marks,
one approved single-answer key, primary concepts, theory/resource references,
review status, and media associations. Import is atomic and idempotent. Theory
is retrieved through exact reviewed mappings; no vector store is used.

Resource passages are embedded in question review. Optional approved HTTPS links
are rendered from the imported records; the model cannot supply URLs. The sample
fixture deliberately contains local theory passages without invented external
resource links. Production resource URLs must be supplied by the team.

## Private media

Configure `SUPABASE_URL`, server `SUPABASE_KEY` with private bucket access, and
`ASSESSMENT_STORAGE_BUCKET=teso-assessments`. Create a private bucket and restrict
upload/write policies to the development team. The service checks bucket privacy
on retrieval; it rejects the public template bucket.

Content packages store `approved/...` object keys and declared role/MIME/transcription,
never expiring URLs. Import validates availability before mutation. Retrieval
permits only the configured Supabase HTTPS origin, rejects redirects and arbitrary
URLs/local paths, verifies MIME and decoded image format, and bounds bytes/pixels.
The supported subset is PNG, JPEG and WebP. Worker vision sends validated original
bytes as base64 image input. No OCR substitution is used. Without vision, all images
need reviewed transcriptions; otherwise feedback falls back with an explicit
reliability reason. Solution media is inaccessible until the owning session is
submitted. The browser receives bytes through the authorised same-origin proxy.
The legacy document endpoint and template storage routes reject assessment-bucket
access; the web diagnostic routes also require their selected bucket to be public.
Keep assessment and template bucket configuration separate in both server apps.

Live media verification needs a configured private bucket and team-provided image
objects; these were absent in the supplied environment.

## API contract

Browser: `/api/assessments/...` (Next.js session cookies).
Server: same paths on FastAPI (signed `X-Teso-Identity` only).
Pydantic request/response schemas are in `api_schemas.py`; generated OpenAPI is
available at `/openapi.json` and `/docs`. Frontend types are in
`frontend/src/lib/assessment-types.ts`.

| Method | Path after `/api/assessments` | Purpose |
|---|---|---|
| GET | `/papers` | Published papers accessible to this identity |
| GET | `/sessions` | Last 50 owned assessments, including saved results |
| POST | `/sessions` | Start with `{paper_id, language}` |
| GET | `/sessions/{id}` | Exam-safe question versions and drafts |
| PUT | `/sessions/{id}/draft` | Save `{answers:[{question_id, selected_option, active_duration_ms?}]}` |
| POST | `/sessions/{id}/submit` | Final authoritative answer list; omitted questions are unanswered |
| GET | `/sessions/{id}/results` | Saved score, units/concepts, revision IDs, question reviews, resources and rates |
| GET | `/sessions/{id}/job` | State, attempts, safe error code |
| GET | `/sessions/{id}/media/{media_id}` | Session-authorised image bytes |

`selected_option` is nullable. No client scores/keys/statistics are accepted.
Final submission locks the session, writes all final answers and grade, and
creates the durable job in one transaction. Repeat submissions return the
existing grade/job even if a new body contains different choices. Draft writes
after submission return 409; foreign sessions return 404; invalid membership
returns 422. Exam responses never contain keys, solutions, theory or solution
media IDs. Saved result responses are server-derived and typed.

## Worker and statistics

Jobs transition queued → processing → completed/partial/failed. PostgreSQL uses
`FOR UPDATE SKIP LOCKED`; SQLite uses write transactions. A renewable lease and
claim token fence stale workers. Expired processing jobs can be reclaimed.
Successful per-question feedback is committed before the next question and is
retained across retries. Transient timeouts/rate limits/5xx errors use bounded
job attempts and exponential delay capped at 60 seconds; exhaustion supplies
base feedback. Invalid content is isolated per question. `partial` means at
least one reviewed fallback; `failed` means the job could not finish, while the
grade/base explanations remain available. No Redis is required.

Scores and concept/unit counts are computed deterministically. Success rates
use the first finalized independent assessment per student/question version,
including unanswered in the denominator. Development/test records, assisted
practice, and responses with known prior hint/solution exposure are excluded.
There is no assisted-practice API yet; such records remain distinct for later
work. Every rate includes numerator, denominator, population description and
percentage. Zero eligible responses returns null; 1–29 is `small_sample`.
These are performance observations in this assessment, not long-term mastery.

## Reproducible verification

```powershell
cd Agentic
.\.venv\Scripts\python.exe -m pytest -q
cd ../frontend
npm run lint
npm run build
```

For an HTTP demo with both servers running and **no continuously running worker**:

```powershell
cd Agentic
.\.venv\Scripts\python.exe scripts/demo_assessment.py --mock
# Or omit --mock to use the configured live provider (three small generations).
```

This creates a server-issued development identity, selects the fixture, saves a
draft, submits one correct/one incorrect/one unanswered response, verifies 2/5
(40%), resubmits idempotently, processes its job, and reopens the result with a
new HTTP client retaining the same cookie. It also checks anonymous rejection,
cross-origin rejection and null population statistics. It prints no cookies or
keys. Real Auth account sign-in and rendered browser interaction still need
verification with an accessible browser and user account; the local demo does
not claim to exercise a real student's Neon sign-in.

The automated suite uses temporary SQLite databases and mocked provider/storage
responses. It covers ownership, grading, unanswered handling, malformed choices,
duplicate/concurrent submissions, durable retries/recovery, no exam leakage,
first-response rates, no-data/small samples, structured feedback grounding,
timeouts and reviewed fallback, storage restrictions, and persistence after
engine restart.
