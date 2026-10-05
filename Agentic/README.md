# Teso Python AI/ML service

This directory is the independent Python deployment root. It contains FastAPI,
the AI/ML API adapter, deterministic assessment grading, Neon schema/import tools,
private-media access, the durable analysis worker, fixtures and tests. Next.js
stays in `../frontend` and reaches this API over HTTP through its server routes.

## Local development

```powershell
cd Agentic
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
# For a fresh setup: copy .env.example to .env and fill server configuration.
.\.venv\Scripts\python.exe -m app.assessment.cli migrate
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-en-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-si-development.json
.\.venv\Scripts\python.exe -m app.assessment.cli import-content fixtures/physics-transfer-ta-development.json
.\.venv\Scripts\python.exe -m app.server
```

In another terminal, from this directory:

```powershell
.\.venv\Scripts\python.exe -m app.assessment.worker
```

Tests: `python -m pytest -q` after activating this directory's virtual environment.
Linux hosts use `.venv/bin/python` or their platform's installed Python runtime.

## Separate hosting

Deploy **only this directory** as the Python project. Install `requirements.txt`.
Use `python -m app.server` as the API start command; it reads `HOST` and `PORT`.
Start `python -m app.assessment.worker` as a separate background worker using the
same environment and Neon database. Apply the additive migration explicitly with
`python -m app.assessment.cli migrate` before starting the services.

Set `ENVIRONMENT=production`, `ALLOW_DEVELOPMENT_CONTENT=false`, a PostgreSQL
`DATABASE_URL`, and `ASSESSMENT_BRIDGE_SECRET`. Set `AI_PROVIDER=aimlapi` and
`AI_API_KEY` for live AI. Use approved published production content rather than
the development fixture. Keep all provider/database/storage credentials on the
Python host. The shared bridge secret is also required on the Next.js host.

Optional container build, from the repository root:

```sh
docker build -t teso-agentic ./Agentic
docker run --env-file /path/to/python-production.env teso-agentic -m app.assessment.cli migrate
docker run --env-file /path/to/python-production.env -p 8000:8000 teso-agentic
docker run --env-file /path/to/python-production.env teso-agentic -m app.assessment.worker
```

The container runs as an unprivileged user and excludes local secrets and virtual
environments. Expose the API through your host's HTTPS endpoint. The Next.js host
sets server-only `FASTAPI_BASE_URL=https://your-python-service.example.com` and
the matching bridge secret. No Python runtime is needed on the Next.js host.

Full [assessment contract and demonstration](../docs/assessment-service.md) and
[separate hosting guide](../docs/separate-hosting.md).

The normalized [content database](../docs/content-database.md) adds multilingual
subject/question versions, answer choices, theory, private image links and an
optional offline ML dataset exporter. Apply migration 003 with the same explicit
`migrate` command. Existing question IDs, grades and history are retained.
