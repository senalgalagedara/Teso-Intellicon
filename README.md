# Teso Intellicon

Next.js student/teacher website in `frontend/`, independently hosted Python assessment and AI service in `Agentic/`. Both use Neon PostgreSQL; the website uses the team's Neon Auth and role system. The server-only signed bridge links the authenticated student to Python.

Students can open the landing page, select self-assessment, choose subject and paper language, take a paper, review deterministic grades and AI explanations, study missed theory, start a personalized next paper, and inspect saved topic history.

## Run locally on Windows

For a fresh checkout, create `Agentic/.venv` with `python -m venv Agentic/.venv`, install `Agentic/requirements-dev.txt`, and run `npm ci` in the root and `frontend/`. Merge the example settings into ignored `Agentic/.env` and `frontend/.env.local`; do not overwrite existing credentials. Both servers need matching `ASSESSMENT_BRIDGE_SECRET`. The frontend needs Neon Auth settings and `DATABASE_URL` for the team's roles/courses schema.

Initialize the assessment schema and optional development content:

```powershell
cd Agentic
.\.venv\Scripts\python.exe -m app.assessment.cli migrate
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-en-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-si-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-ta-development.json
cd ..
```

Run these in three separate terminals, from the repository root:

```powershell
npm run dev:frontend
npm run dev:agentic
npm run dev:worker
```

Open http://localhost:3000. Sign in with a student account for reviewed production papers. To try the sample flow, enable `TESO_DEMO_MODE=true` in the frontend and `ALLOW_DEVELOPMENT_CONTENT=true`, `ENVIRONMENT=development` in Python, then click **Try local development demo** on self-assessment. Demo content and scores are labeled and excluded from population statistics. Use the same browser and hostname for saved demo history.

`npm run dev` starts the website and API together; the worker still needs its own terminal. Start each service once. If Windows blocks port 8000, run Uvicorn on an available port such as 8081 and set `FASTAPI_BASE_URL=http://127.0.0.1:8081` in the frontend, then restart Next.js.

The worker uses the configured AI provider. `AI_PROVIDER=aimlapi` uses the server-only key; `mock` supplies labeled local feedback. Grading remains deterministic and available while feedback is queued.

## Database and deployment

The team's application schema is `frontend/migrations/0001_app_schema.sql`; it must exist on the Neon branch used by Auth and the frontend. On a fresh branch, enable Neon Auth first and apply that SQL in Neon's SQL editor. Python's explicit migration command owns only `teso_*` assessment tables, including durable plans and learning snapshots. It backfills older submitted assessments without resetting application data.

Production requires reviewed published paper packages. The included English, Sinhala and Tamil Physics samples demonstrate the flow and need content/language review before student rollout. Adaptive selection uses existing published question versions, preferring fresh questions on missed theory and revisiting prior correct topics. Scores on different papers or repeated questions do not establish mastery or guarantee exam success.

- [Assessment setup and API contract](docs/assessment-service.md)
- [Personalized follow-ups and history](docs/personalized-learning.md)
- [Content tables, languages, images and ML export](docs/content-database.md)
- [Separate hosting](docs/separate-hosting.md)
- [Verification record](docs/assessment-verification.md)

Checks: `npm run test:agentic`, `npm run build:frontend`, and `npm run lint` from `frontend/`.
