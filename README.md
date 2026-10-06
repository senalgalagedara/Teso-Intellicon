<<<<<<< HEAD
# Teso Intellicon

A modern full-stack educational platform for Sri Lankan G.C.E. A/L students and tuition teachers. It combines a **Next.js 15 App Router** frontend with server-side Role-Based Access Control (RBAC), **Neon Serverless Postgres** with **Neon Auth (Managed Better Auth)**, and a **Python FastAPI** backend that hosts both the AI/document services and the **TESO Revision Engine**: an adaptive MCQ practice, spaced-repetition, and cohort-analytics system.

> **Revision Engine scope (v1):** Classical algorithms only (Elo/Rasch, BKT, FSRS, statistics). No LLMs are used by the engine. Explanations are teacher-written text stored in the database. The existing LLM endpoints (`/api/ai/*`) are unchanged and independent.

---

## 🚀 Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │                 Web Browser                  │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTPS & Auth Cookies
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             Next.js 15 App Router            │
                      │  • Server Components & Server Actions        │
                      │  • Role-Based Access Control (DAL)           │
                      │  • Neon Auth Session Resolution              │
                      │  • Practice / review / analytics UI          │
                      └──────┬───────────────────────────────┬───────┘
                             │                               │
    HTTP (@neondatabase/serverless)                          │ server-to-server only
    app.* reads/writes       │                               │ /api/ai/* (LLM, existing)
                             │                               │ /v1/* (Revision Engine, new)
                             ▼                               ▼
┌──────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
│             Neon Serverless Postgres             │   │           FastAPI Backend            │
├──────────────────────────────────────────────────┤   │ AI services (existing)               │
│ Schema 'neon_auth': user, session, accounts      │   │ • Multi-provider LLM routing         │
├──────────────────────────────────────────────────┤   │ • Summaries, embeddings, documents   │
│ Schema 'app': (owned by Next.js)                 │   ├──────────────────────────────────────┤
│ • user_roles, teacher_requests                   │   │ Revision Engine (new)                │
│ • courses, enrollments                           │◄──┤ • Elo/Rasch ability & difficulty     │
│ • subjects, topics, questions ✨                 │   │ • BKT sub-topic mastery              │
│ • question_serves, attempts ✨                   │   │ • FSRS spaced repetition             │
│ • assessments, assessment_scores ✨              │   │ • Adaptive question selector         │
│ • course_links, events ✨                        │   │ • Wrong-answer diagnosis             │
├──────────────────────────────────────────────────┤   │ • Item stats & Z-score projection    │
│ Schema 'engine': (owned by FastAPI) ✨            │   └──────────────────────────────────────┘
│ • student_ability, question_rating               │      psycopg 3 over the Neon pooled
│ • topic_mastery, fsrs_card                       │      connection (reads app.*,
│ • attempt_diagnosis, engine_processed           │      writes engine.*)
└──────────────────────────────────────────────────┘
=======
# Next.js + FastAPI + Supabase Full-Stack AI Template

A state-of-the-art full-stack production template combining **Next.js App Router** (Frontend & Backend API Route Handlers), **Supabase** (PostgreSQL Database & Storage), and a **Python FastAPI** AI Engine.

---

## ⚡ Architecture Overview..

```
                      ┌──────────────────────────────────────────┐
                      │              Web Browser                 │
                      └─────────────┬────────────────────┬───────┘
                                    │                    │
                  (UI & Direct Edge)│                    │(Direct Storage Upload)
                                    ▼                    ▼
        ┌──────────────────────────────────────┐     ┌───────────────────────┐
        │        Next.js App Router            │     │  Supabase Platform    │
        │  • Frontend React Components (RSC)   │     │  • PostgreSQL DB      │
        │  • Next.js Backend API (/api/*)      │◄───►│  • Object Storage     │
        └──────────────────┬───────────────────┘     │    ('app-storage')    │
                           │                         │  • Row-Level Security │
             (Internal AI  │                         └───────────▲───────────┘
             Service Proxy)│                                     │
                           ▼                                     │
        ┌──────────────────────────────────────┐                 │
        │          Python FastAPI              ├─────────────────┘
        │  • High-throughput async AI engine   │ (Download & Process Docs)
        │  • Pydantic data validation          │
        │  • Chat, Summaries, Embeddings       │
        │  • OpenAI / Gemini / Claude ready    │
        └──────────────────────────────────────┘
>>>>>>> origin/main
```

---

<<<<<<< HEAD
## 🌟 Key Features

### 🎓 Role-Based Access Control (RBAC)
- **Student Portal:** View pending course invitations, accept/decline invites, access enrolled course materials, practice adaptive MCQs, complete spaced-repetition reviews, and track mastery.
- **Teacher Workspace:** Create courses with collision-resistant 6-character join codes (`[A-Z2-9]`), manage rosters, send email invitations, author the question bank, and view cohort item analytics and Z-score projections.
- **Teacher Approval Pipeline:** Unverified teachers submit requests with optional notes; state machine (`pending` ➔ `approved` / `rejected`) prevents unauthorized course creation.
- **Admin Console:** Super-admin dashboard (designated via `ADMIN_EMAILS`) to inspect applicant profiles and approve/reject teacher applications.

### ⚡ Database & Auth Stack
- **Neon Serverless Postgres:** Scalable branching Postgres with pooled HTTP connectivity via `@neondatabase/serverless`.
- **Neon Auth (Managed Better Auth):** Secure session cookies, passwordless/credential authentication, and automated user synchronization.
- **Server-Only Data Access Layer (DAL):** Hardened server-side authorization guards preventing unauthenticated or unauthorized data access.

### 🧠 Revision Engine (new)
- **Adaptive practice:** The next question is chosen from the student's weak topics, due reviews, and a target ~70% chance of success.
- **Memory-aware revision:** FSRS schedules micro-reviews before retention fades.
- **Why-you-missed-it diagnosis:** Each attempt is labelled `solid`, `lucky_guess`, `careless_error`, or `conceptual_gap` from response time, correctness, and peer facility.
- **Peer diagnostics:** Students see peer-easy traps they missed versus cohort-hard questions.
- **Educator analytics:** Facility, discrimination, flagged items, and cohort difficulty curves per course.
- **Cross-subject Z-score projection:** With linked courses, teachers can see projected composite Z-scores and flag Island-Rank contenders and at-risk students.

### 🤖 AI Engine (existing, FastAPI)
- **Multi-Provider LLM Integration:** Google Gemini, OpenAI GPT, or built-in offline simulation mode.
- **Task-Driven Text Analysis:** Summarization, sentiment analysis, key point extraction, action items.
- **Vector Embeddings:** Embeddings for semantic search and document retrieval.
- **Document Processing:** Stream and process files from storage for automated summarization.

---

## 📁 Repository Structure

New or changed items are marked ✨.

```
├── frontend/                     # Next.js 15 App Router Frontend & API
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/
│   │   │   │   ├── admin/        # Admin approval console
│   │   │   │   ├── teacher/
│   │   │   │   │   ├── courses/[id]/questions/ ✨ Question bank CRUD
│   │   │   │   │   ├── courses/[id]/analytics/ ✨ Item stats, difficulty curve
│   │   │   │   │   └── zscores/                ✨ Linked-course Z-score view
│   │   │   │   ├── student/
│   │   │   │   │   ├── practice/               ✨ Adaptive practice session
│   │   │   │   │   ├── review/                 ✨ FSRS due reviews
│   │   │   │   │   └── progress/               ✨ Mastery & peer diagnostics
│   │   │   │   └── pending/      # Teacher verification waiting room
│   │   │   ├── (auth)/           # Sign-in & sign-up flows
│   │   │   ├── actions/          # Type-safe Server Actions
│   │   │   │   ├── admin.ts · teacher.ts · student.ts
│   │   │   │   ├── practice.ts   ✨ getNextQuestion, submitAnswer
│   │   │   │   └── questions.ts  ✨ teacher question CRUD
│   │   │   └── api/              # Route handlers (AI proxy, health check, auth)
│   │   │       └── cron/engine/  ✨ Protected endpoint for scheduled engine jobs
│   │   ├── components/           # Reusable UI (ActionForm, SubmitButton, ✨ QuestionCard, MasteryBar)
│   │   └── lib/
│   │       ├── auth/             # DAL, role guards, session utilities
│   │       ├── db/               # Neon client, courses, roster queries, ✨ questions & attempts queries
│   │       └── engine/           ✨ server-only typed client for the FastAPI /v1 routes
│   ├── migrations/
│   │   ├── 0001_app_schema.sql
│   │   └── 0002_revision_app.sql ✨ app.* tables for the revision engine
│   └── package.json
│
├── backend/                      # Python FastAPI Microservice
│   ├── app/
│   │   ├── main.py               # Entry point, CORS, router registration
│   │   ├── config.py             # Pydantic settings (✨ DATABASE_URL, ENGINE_API_KEY)
│   │   ├── schemas.py            # Existing AI schemas
│   │   ├── db.py                 ✨ psycopg 3 async connection pool
│   │   ├── security.py           ✨ X-Engine-Key dependency
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── ai.py
│   │   │   ├── documents.py
│   │   │   └── engine.py         ✨ /v1/* revision engine routes
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   └── supabase_service.py
│   │   └── engine/               ✨ Revision engine package
│   │       ├── schemas.py        # Pydantic models for /v1
│   │       ├── algorithms/
│   │       │   ├── rasch.py      # Elo/Rasch updates
│   │       │   ├── bkt.py
│   │       │   ├── fsrs_adapter.py
│   │       │   ├── selector.py
│   │       │   ├── diagnosis.py
│   │       │   ├── item_stats.py
│   │       │   └── zscore.py
│   │       ├── services/         # Orchestrate algorithms + DB transactions
│   │       │   ├── attempts.py · practice.py · reviews.py · cohort.py
│   │       └── jobs/
│   │           └── jobs.py       # recalibrate, refresh_item_stats, ...
│   ├── migrations/
│   │   └── 0001_engine_schema.sql ✨ engine.* tables
│   ├── tests/                    ✨ pytest suite + synthetic student simulator
│   ├── requirements.txt
│   └── .env.example
│
├── scripts/                      ✨
│   ├── seed_questions.py         # Seed a starter question bank
│   └── seed_mock_cohort.py       # Mock students/scores for Z-score demo
│
├── .env                          # Root environment variables
├── neon.ts                       # Neon branching and preview bucket configuration
├── supabase_setup.sql            # Auxiliary object storage & RLS configuration
└── package.json                  # Root monorepo script runner
=======
## 📁 Project Directory Structure

```
├── frontend/                     # Next.js App Router (Frontend + Next.js Backend)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              # Next.js Backend API Handlers
│   │   │   │   ├── health/       # Health diagnostic (checks Next.js + FastAPI + Supabase)
│   │   │   │   ├── ai/           # Proxy to FastAPI AI endpoints
│   │   │   │   ├── storage/      # Supabase Storage upload and listing handlers
│   │   │   │   └── notes/        # Supabase PostgreSQL CRUD handlers
│   │   │   ├── layout.tsx        # Root HTML layout and fonts
│   │   │   ├── globals.css       # Design system, glassmorphism, responsive utilities
│   │   │   └── page.tsx          # Interactive dashboard & studio UI
│   │   └── lib/
│   │       └── supabase/
│   │           ├── client.ts     # Browser-safe Supabase client singleton
│   │           ├── server.ts     # Server-side Supabase client with admin credentials
│   │           └── storage.ts    # Supabase Storage helper functions
│   ├── .env.local.example        # Next.js environment configuration template
│   ├── .env.local                # Active local environment variables
│   └── package.json
│
├── backend/                      # Python FastAPI AI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry point with CORS & routes
│   │   ├── config.py             # Pydantic settings & environment loader
│   │   ├── schemas.py            # Pydantic models for chat, analyze & embeddings
│   │   ├── routers/
│   │   │   ├── health.py         # /health endpoint
│   │   │   ├── ai.py             # /api/ai/chat, /api/ai/analyze, /api/ai/embeddings
│   │   │   └── documents.py      # /api/documents/process (Supabase Storage doc AI)
│   │   └── services/
│   │       ├── ai_service.py     # Multi-provider LLM service (Gemini, OpenAI, Mock fallback)
│   │       └── supabase_service.py # Python Supabase client & storage integration
│   ├── .venv/                    # Python virtual environment (pre-created)
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # FastAPI environment configuration template
│   └── .env                      # Active local environment variables
│
├── supabase_setup.sql            # One-click SQL script for Supabase tables & storage policies
├── package.json                  # Root monorepo script runner
└── README.md
>>>>>>> origin/main
```

---

<<<<<<< HEAD
## 🛠️ Getting Started

### Prerequisites
- **Node.js:** v18.17+ or v20+
- **Python:** v3.10+
- **Neon Account:** [neon.tech](https://neon.tech/) (for Postgres & Neon Auth)

---

### 1. Environment Configuration

**Root `.env` (Next.js):**
```env
# Neon Auth (Managed Better Auth)
NEON_AUTH_BASE_URL=https://<your-neon-auth-host>/neondb/auth
NEON_AUTH_COOKIE_SECRET=your-32-character-random-secret-key

# Neon Pooled Database Connection
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/neondb?channel_binding=require&sslmode=require"

# Admin Configuration (comma-separated email addresses)
ADMIN_EMAILS=admin@example.com

# FastAPI Microservice
FASTAPI_BASE_URL=http://127.0.0.1:8000
ENGINE_API_KEY=dev-secret-change-me       # ✨ shared secret for /v1 routes
CRON_SECRET=another-random-secret          # ✨ protects /api/cron/engine
```

**`backend/.env` (FastAPI):**
```env
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# ✨ Revision engine
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/neondb?sslmode=require"
ENGINE_API_KEY=dev-secret-change-me        # must match the Next.js value

# Optional AI Providers (choose one, unrelated to the revision engine)
GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key
DEFAULT_AI_MODEL=gemini-1.5-flash
```

---

### 2. Database Migrations

Run in this order against your Neon database:
```bash
# Existing: roles, courses, enrollments
psql "$DATABASE_URL" -f frontend/migrations/0001_app_schema.sql

# ✨ Revision engine: app-side tables (owned by Next.js)
psql "$DATABASE_URL" -f frontend/migrations/0002_revision_app.sql

# ✨ Revision engine: engine-side tables (owned by FastAPI)
psql "$DATABASE_URL" -f backend/migrations/0001_engine_schema.sql
```

---

### 3. Installation & Running Locally

```bash
npm run install:all    # root, frontend, and backend deps
npm run dev            # Next.js and FastAPI concurrently
```

- **Next.js Web App:** [http://localhost:3000](http://localhost:3000/)
- **FastAPI Server:** [http://127.0.0.1:8000](http://127.0.0.1:8000/)
- **FastAPI Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🗄️ Database Schema & Roles

| Role | Access Permissions | Landing Path |
| :--- | :--- | :--- |
| **`admin`** | Review, approve, or reject teacher requests; promote users; trigger engine jobs | `/admin` |
| **`teacher`** | Create courses, manage rosters, author questions, view analytics and Z-scores for own courses | `/teacher` |
| **`teacher_pending`** | Waiting room; blocked from course tools until approved | `/pending` |
| **`student`** | Accept/decline invitations, practice and review questions from courses they are enrolled in | `/student` |

---

## 🧠 Revision Engine

### Design Rules
1. **The browser never talks to the engine.** Only Next.js server code (Server Actions, route handlers) calls `/v1/*`, using `ENGINE_API_KEY`.
2. **Two schemas, one owner each.**
   - `app.*` is owned by Next.js (`frontend/migrations`).
   - `engine.*` is owned by FastAPI (`backend/migrations`).
   - The engine reads `app.*` (questions, attempts, enrollments, scores) and writes only `engine.*`. Next.js may read `engine.*` for dashboards but never writes it.
3. **Authorization lives in Next.js, calculation lives in Python.** Use the existing DAL guards before every engine call: a student may only practice from courses where their enrollment is accepted, and a teacher may only see courses they own.
4. **Latency is measured server-side.** `served_at` is recorded when a question is sent; `latency_ms` is computed by the database at answer time.
5. **Attempts are never lost.** The attempt is saved first, then the engine processes it. The engine also catches up lazily on any unprocessed attempts.
6. **Idempotency:** Each attempt has a client-generated UUID; each serve can be answered once (`UNIQUE(serve_id)`).

### Neon-Specific Notes
- **Next.js side:** The `@neondatabase/serverless` HTTP driver has no interactive transactions. Keep Next.js writes to single statements (the attempt insert is one `INSERT ... ON CONFLICT DO NOTHING`). Multi-statement transactions happen in the engine.
- **Python side:** Use `psycopg 3` with the pooled connection string. The Neon pooler runs in transaction mode: use ordinary transactions and `SELECT ... FOR UPDATE`, avoid session-level features (`SET`, advisory locks, `LISTEN`), and if you see prepared-statement errors set `prepare_threshold=None` on the connection.

### Request Flows

#### 1. Get the next question (`Server Action getNextQuestion`)
```
Browser ─► Server Action getNextQuestion(courseId)
           Next.js: requireRole(student) → verify accepted enrollment in courseId
           Next.js ─► POST /v1/practice/next { student_id, course_id }
                      Engine:
                        1. catch up: process this student's unprocessed attempts
                        2. load θ, topic mastery, due FSRS cards, candidate questions
                        3. score candidates, pick one
           Next.js ◄─ { question_id, reason }
           Next.js: load question (WITHOUT correct_option / explanation)
                    INSERT app.question_serves (served_at = now())
Browser ◄─ { serve_id, question, reason }
```

#### 2. Submit an answer (`Server Action submitAnswer`)
```
Browser ─► submitAnswer({ attemptId, serveId, chosenOption })
           Next.js: requireRole(student); load serve (must belong to student)
           Next.js: ONE statement, DB computes latency and correctness:
                    INSERT INTO app.attempts (id, serve_id, ..., latency_ms, is_correct)
                    SELECT ..., LEAST(GREATEST(EXTRACT(EPOCH FROM now()-s.served_at)*1000, 500), 600000),
                           (q.correct_option = $chosen)
                    FROM app.question_serves s
                    JOIN app.questions q ON q.id = s.question_id
                    WHERE s.id = $serve AND s.student_id = $me
                    ON CONFLICT DO NOTHING
           Next.js ─► POST /v1/attempts/process { attempt_id } (3 s timeout)
                      Engine (one transaction, idempotent via engine_processed):
                        1. update question_rating (b) and student_ability (θ)
                        2. update topic_mastery (BKT)
                        3. update/create fsrs_card
                        4. classify → engine.attempt_diagnosis
           Next.js ◄─ { label, p_mastery, next_due_at }
Browser ◄─ { is_correct, correct_option, explanation, diagnosis? }
=======
## 🚀 Quick Start Guide

### 1. Run Both Frontend and Backend Concurrently
From the project root directory:
```bash
npm run dev
```
- **Next.js Frontend & API:** [http://localhost:3000](http://localhost:3000)
- **FastAPI AI Backend:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **FastAPI Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Run Independently

#### Run Next.js:
```bash
cd frontend
npm run dev
```

#### Run FastAPI:
```bash
cd backend
# Windows:
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
# Mac/Linux:
# source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
>>>>>>> origin/main
```

---

<<<<<<< HEAD
## 🧪 Available API Endpoints

### Next.js API Routes
- `ALL /api/auth/*` - Neon Auth request proxy and session management
- `POST /api/ai` - Authenticated proxy to the FastAPI AI engine
- `GET /api/health` - Unified health check across Next.js and backend services
- `POST /api/cron/engine` - Scheduled engine jobs (requires `CRON_SECRET`)

### FastAPI Microservice
- `GET /health` - Service health and active AI provider inspection
- `POST /api/ai/chat` - Multi-turn conversational completions
- `POST /api/ai/analyze` - NLP tasks (summaries, sentiment, key extraction)
- `POST /api/ai/embeddings` - High-dimensional vector embeddings
- `POST /api/documents/process` - Storage document retrieval & analysis pipeline
- `/v1/*` - Revision engine endpoints (`/practice/next`, `/attempts/process`, `/reviews/due`, `/students/{id}/progress`, `/courses/{id}/item-stats`, `/courses/{id}/zscores`, `/admin/jobs/{name}`)

---

## 📜 License

This project is licensed under the MIT License.
=======
## 🗄️ Supabase Setup (Database & Storage)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open your project's **SQL Editor**.
3. Copy the contents of [`supabase_setup.sql`](file:///c:/Users/user/Desktop/New%20folder/supabase_setup.sql) and paste it into the SQL Editor, then click **Run**.
   - This creates the `app-storage` bucket with public storage policies.
   - This creates the `documents` and `notes` PostgreSQL tables with Row Level Security (RLS).
4. In Supabase Dashboard, navigate to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (keep secret!)
5. Paste these into `frontend/.env.local` and `backend/.env`.

---

## 🤖 AI Provider Configuration (FastAPI)

The FastAPI engine comes with a **built-in simulated fallback** so you can develop immediately without an API key!

To enable live LLMs, open `backend/.env` and provide either:
- `GEMINI_API_KEY=your_gemini_api_key` (Google AI Studio)
- or `OPENAI_API_KEY=your_openai_api_key` (OpenAI)

The FastAPI service will automatically detect the key and switch to live LLM generation.

---

## 🧪 Available Endpoints

### Next.js Backend Routes:
- `GET /api/health` - Checks Next.js, Supabase, and FastAPI connectivity.
- `GET /api/notes` & `POST /api/notes` - Supabase Database CRUD.
- `POST /api/storage/upload` - Secure server-side file upload to Supabase Storage.
- `GET /api/storage/files` - List files stored in Supabase Storage.
- `POST /api/ai` - Next.js proxy route to Python FastAPI AI service.

### FastAPI Python AI Routes:
- `GET /health` - FastAPI status & configured providers.
- `POST /api/ai/chat` - Multi-turn conversational completion.
- `POST /api/ai/analyze` - NLP summarization, sentiment analysis, key point extraction.
- `POST /api/ai/embeddings` - Vector embeddings generation for pgvector similarity search.
- `POST /api/documents/process` - Fetches and summarizes documents directly from Supabase Storage.
>>>>>>> origin/main
