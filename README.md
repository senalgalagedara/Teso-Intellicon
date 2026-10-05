# Teso — student learning and self-assessment

The first assessment milestone extends the template below with Python grading,
Neon persistence, a database-backed analysis worker, AI/ML API feedback, and an
authenticated Next.js student flow. Start with the
[assessment setup, API contract and reproducible demo](docs/assessment-service.md).
The supplied sample paper is a development fixture, not expert-reviewed content.

Python code lives in **`Agentic/`**; Next.js lives in **`frontend/`**. Deploy each
folder independently. Set the Next.js server's `FASTAPI_BASE_URL` to the Python
service's HTTPS origin. See the [separate hosting guide](docs/separate-hosting.md)
and [Python service instructions](Agentic/README.md).

The original template documentation follows for its existing diagnostic tools.

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
```

---

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
├── Agentic/                      # Python FastAPI AI Backend
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
```

---

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
cd Agentic
# Windows:
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
# Mac/Linux:
# source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

---

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
5. Paste these into `frontend/.env.local` and `Agentic/.env`.

---

## 🤖 AI Provider Configuration (FastAPI)

The FastAPI engine comes with a **built-in simulated fallback** so you can develop immediately without an API key!

To enable live LLMs, open `Agentic/.env` and provide either:
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
