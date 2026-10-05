# Hosting Python and Next.js separately

| Component | Deployment root | Build/install | Start |
|---|---|---|---|
| Next.js website + session/API proxy | `frontend/` | `npm ci && npm run build` | `npm run start` |
| Python assessment API | `Agentic/` | `python -m pip install -r requirements.txt` | `python -m app.server` |
| Python analysis worker | `Agentic/` | Same Python dependencies | `python -m app.assessment.worker` |

The root package scripts are local development conveniences, not a combined
deployment requirement. Host the API and worker as independent processes using
the same Neon database. The website's server routes call the Python API; browsers
continue to use the website origin. There is no Python code in the Next.js build.

On the **Python API and worker hosts**, configure:

```dotenv
ENVIRONMENT=production
ALLOW_DEVELOPMENT_CONTENT=false
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://USER:PASSWORD@NEON_HOST/neondb?sslmode=require
ASSESSMENT_BRIDGE_SECRET=your-random-shared-secret-at-least-32-characters
AI_PROVIDER=aimlapi
AI_API_KEY=your-server-only-provider-key
AI_BASE_URL=https://api.aimlapi.com/v1
AI_MODEL=gpt-4o-mini
```

Set private storage variables from `Agentic/.env.example` when using image content.
Use your host's assigned `PORT` when it differs from 8000. Run the migration once
as a deployment/release command: `python -m app.assessment.cli migrate`.
Import reviewed production content through the Python developer CLI.

On the **Next.js host**, configure:

```dotenv
FASTAPI_BASE_URL=https://your-python-service.example.com
ASSESSMENT_BRIDGE_SECRET=the-same-random-shared-secret
NEON_AUTH_BASE_URL=your-neon-auth-endpoint
NEON_AUTH_COOKIE_SECRET=your-random-cookie-secret-at-least-32-characters
TESO_DEMO_MODE=false
ASSESSMENT_STORAGE_BUCKET=teso-assessments
```

`FASTAPI_BASE_URL` is the Python service's HTTPS origin without an `/api` suffix,
query, credentials, or path prefix. All Next.js Python proxies use this single
server-only setting. Production requires it; it does not fall back to localhost.
`AI_API_KEY` and `DATABASE_URL` are not needed on the Next.js host. Next.js still
needs its server runtime for authentication and the signed assessment proxy;
this is not a static-only export.

For local development, run `npm run dev:frontend`, `npm run dev:agentic`, and
`npm run dev:worker` independently. The default local API URL is
`http://127.0.0.1:8000`. `npm run dev` remains an optional combined local launcher.

This change prepares independent deployment; it does not create hosting accounts
or publish either service to an external hosting provider.
