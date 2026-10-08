<div align="center">

<img src="Teso/public/teso-logo-final.png" alt="TESO Logo" width="200"/>

# TESO — Adaptive Learning & Exam Platform

**Sri Lanka's first AI-powered self-study and exam hosting platform, built for A/L students.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-red?logo=redis)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black?logo=socket.io)](https://socket.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?logo=turborepo)](https://turbo.build/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm)](https://pnpm.io/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Monorepo Structure](#-monorepo-structure)
- [Teso (Study Platform)](#-teso--study-platform)
- [Teso Exams](#-teso-exams--exam-hosting-platform)
- [Teso Logics (AI Engine)](#-teso-logics--ai-adaptive-learning-engine)
- [Shared Packages](#-shared-packages)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Architecture Overview](#-architecture-overview)

---

## 🌟 Overview

TESO is a full-stack monorepo designed to revolutionise the exam preparation experience for Sri Lankan A/L students. It combines three distinct but deeply integrated applications:

| Application | Purpose | Stack |
|---|---|---|
| **Teso** | AI-powered self-study platform with adaptive learning | Next.js 16, React 19 |
| **Teso Exams** | Real-time exam hosting & candidate management | Next.js 16, Socket.IO, Redis |
| **Teso Logics** | AI/ML adaptive learning backend engine | FastAPI, Python, SQLAlchemy |

> **The vision:** End the era of rote memorisation. Students learn with a system that adapts to them — tracking memory decay, predicting burnout, and generating personalised daily study plans.

---

## 🗂 Monorepo Structure

```
Teso-monorepo/
├── Teso/                    # Study platform (Next.js)
├── Teso-exams-main/         # Exam hosting platform (Next.js + Socket.IO)
├── Teso-logics/             # AI adaptive learning engine (FastAPI/Python)
├── packages/
│   └── shared-auth/         # Shared authentication utilities
├── services/
│   └── python-api/          # Python service configuration
├── supabase/                # Supabase configuration
├── turbo.json               # Turborepo pipeline config
├── pnpm-workspace.yaml      # pnpm workspace definition
└── package.json             # Root workspace manifest
```

The monorepo is managed with **Turborepo** for build orchestration and **pnpm workspaces** for package management. All JavaScript apps share a single `node_modules` tree for efficiency.

---

## 📚 Teso — Study Platform

> **Location:** `Teso/`  
> **URL:** `teso.lk` | `http://localhost:3000`  
> **Purpose:** The primary learning interface. Students study, revise, plan, and track progress through a beautiful, AI-enhanced dashboard.

### Features

#### 🏠 Landing Page
The public landing page introduces TESO with cinematic animations, social proof, and CTAs to both the study and exam platforms. It links directly to social channels (LinkedIn, Facebook, Instagram).

#### 🎓 Learn Module (`/learn`)
Students access structured A/L Chemistry lessons (and other subjects) with progress tracking. Lessons are tied to the adaptive skill graph, so completing one unlocks prerequisites for the next.

#### 📊 Analyse Module (`/analyse`)
Provides in-depth analytics about a student's performance. Visualises mastery levels per skill, quiz accuracy trends, response times, and areas for improvement — powered by data from the AI backend.

#### 🗓 Plan Module (`/plan`)
Displays the AI-generated daily study plan, broken down into lesson time, MCQ practice, and paper 2 essay practice blocks. Students can mark tasks as complete and see their progress against the plan.

#### 📝 Revision Module (`/revison`)
Surfaces the spaced repetition revision queue. Shows which skills are due (or overdue) for review, sorted by forgetting risk. Students log their revision session and the algorithm schedules their next review automatically.

#### 📅 Timetable Module (`/timetable`)
A weekly calendar view for managing study sessions. Integrates with the plan module to show what should be studied each day of the week.

#### ✅ To-Do Module (`/todo`)
A lightweight task manager for student-defined tasks and reminders, helping students stay organised beyond the AI-generated schedule.

#### 🎬 Videos Module (`/videos`)
Curated YouTube video recommendations fetched via the Teso Logics API. Videos are linked to specific syllabus topics, so students find the right content quickly.

#### 🏆 Leaderboard (`/leaderboard`)
A competitive leaderboard ranking students by mastery progress, quiz scores, and study streaks to encourage healthy academic competition.

#### 🧪 Exams Module (`/exams`)
Access to past papers and practice exams within the study platform, bridging self-study with exam-style practice.

#### 👤 Profile Module (`/profile`)
Student profile management — name, grade, stream, subjects, exam date, and months remaining to their A/L exam.

#### 📰 Blog & Content Pages
- `/blog` — Educational articles and study tips
- `/about` — Team and mission information
- `/pricing` — Subscription plans
- `/privacy` — Privacy policy
- `/terms` — Terms and conditions

#### 🔐 Authentication
Full email/password and OTP-based authentication using **NextAuth v5** with a **Prisma** adapter. Includes email verification flows, secure session management via JWT (using `jose`), and refresh token rotation.

---

## 🎯 Teso Exams — Exam Hosting Platform

> **Location:** `Teso-exams-main/`  
> **URL:** `exam.teso.lk` | `http://localhost:3001`  
> **Purpose:** Sri Lanka's first dedicated digital exam hosting platform — allows educators to create, host, and mark exams, while students join live exam sessions in real time.

### Features

#### 🌐 Landing Page (Public)
A sleek landing page with a live clock, "Enter exam code" quick-join flow, and links to the study platform. Candidates can join an active exam session directly from here without navigating to a separate page.

#### 👨‍🏫 Host Dashboard (`/host`)
The central command centre for exam hosts. Hosts see all their created papers, active sessions, student counts, and results at a glance.

**Host features include:**

##### ➕ Create Exam (`/host/create`)
A multi-step wizard to create a new exam paper:
- Set title, exam date, duration, and number of questions
- Upload question paper and answer key (stored in **AWS S3**)
- Configure difficulty per question, with text or image-based answers (up to 5 choices per question)
- Questions support rich text and embedded images

##### 📄 Manage Papers (`/host/papers`)
View all created exam papers, their upload status (`PENDING` / `UPLOADED`), question count, total marks, and linked exam sessions.

##### 🚀 Lobby Management (`/host/lobby`)
Before an exam begins, hosts control a **real-time lobby**:
- See all candidates who have registered with their name and class code
- **Admit** or **Decline** individual candidates
- Monitor live candidate count
- Start the exam session when ready — this broadcasts a live signal to all admitted candidates simultaneously via **Socket.IO**

##### 📡 Live Monitor (`/host/monitor`)
During an active exam, hosts see a real-time dashboard:
- Candidates currently in the exam vs. those who have submitted
- Per-candidate: questions answered, progress percentage, time remaining
- **Live server-side countdown timer** synced across all connected clients via Redis Pub/Sub
- Automatic exam-end broadcast when the timer hits zero

##### 📈 Results & Analytics (`/host/results`)
Post-exam results dashboard:
- Overall score distribution
- Per-student scores, answer breakdown, and time-per-question
- Flagged questions (where students marked for review)
- Exportable data for further analysis

##### 👥 Students & Candidates Management (`/host/students`, `/host/candidates`)
Manage all students and candidates who have interacted with exam papers. View detailed per-student history and access logs.

#### 🧑‍💻 Candidate Flow (`/candidate`)
The complete exam-taking experience for students:

##### 🪪 Identity Verification (`/candidate/identity`)
Before entering an exam, candidates enter their full name and class card number. The system validates the exam code and their eligibility before admitting them.

##### ⏳ Waiting Room (`/candidate/waiting`)
Candidates wait in a live lobby with real-time status updates. The UI shows whether they are `WAITING`, `ADMITTED`, or `DECLINED` by the host — all via Socket.IO events.

##### 📋 Exam Interface (`/candidate/exam`)
The live exam-taking UI:
- Questions displayed one at a time or in a paginated view
- Multiple-choice answers (up to 5 options, with optional images)
- **Flag for review** functionality to mark questions for revisiting
- **Live countdown timer** synced from the server — no client-side manipulation possible
- Auto-submit on timer expiry
- Progress indicator showing answered vs. total questions

##### ✅ Submission (`/candidate/submitted`)
Post-submission confirmation screen with a summary of the candidate's answers.

#### 🔗 Real-Time Infrastructure (Socket.IO + Redis)
The exam platform uses a **custom Node.js server** (`server.js`) wrapping Next.js with Socket.IO on top. Key real-time events:

| Event | Direction | Purpose |
|---|---|---|
| `join-lobby` | Client → Server | Candidate enters the waiting lobby |
| `join-host-lobby` | Host → Server | Host opens the lobby management UI |
| `join-exam-room` | Client → Server | Candidate enters the active exam |
| `join-host-monitor` | Host → Server | Host opens live monitoring |
| `timer-sync` | Server → All | Broadcasts remaining seconds every 5s |
| `exam-ended` | Server → All | Signals when time runs out |

Redis Pub/Sub via `@socket.io/redis-adapter` ensures timer state is consistent across horizontally scaled instances.

#### 🔐 Authentication & Security
- **NextAuth v5** with custom credential-based sign-in
- OTP email verification for new accounts (via **Nodemailer**)
- Account lockout after repeated failed login attempts
- Session-based middleware with role checks (`STUDENT` / `host`)
- Shared auth package (`@teso/auth`) across both Next.js apps

#### 💳 Pricing (`/pricing`)
Subscription pricing page for exam hosting plans.

---

## 🤖 Teso Logics — AI Adaptive Learning Engine

> **Location:** `Teso-logics/`  
> **URL:** `http://localhost:8000`  
> **Docs:** `http://localhost:8000/docs` (Swagger UI)  
> **Purpose:** The Python/FastAPI backend that powers all AI features. It implements a multi-layer cognitive science-based learning model that adapts to each student in real time.

### Architecture

The engine follows a continuous **Observe → Estimate → Predict → Adapt** feedback loop:

```
Student Action
     ↓
Event Tracker        ← logs every interaction
     ↓
User State Engine    ← updates skill states (mastery, memory, confidence)
     ↓
┌────────────────────────────────────────────┐
│  BKT Mastery   Spaced Rep   Burnout Pred   │
│  Estimator     Scheduler    Engine          │
└────────────────────────────────────────────┘
     ↓
Adaptive Recommender  ← generates next action
     ↓
Student sees: quiz / revision / break / new lesson
```

### API Modules

#### 1. 📡 Event Tracking (`/api/adaptive/events`)
**Purpose:** The entry point for all student interactions. Every meaningful action is recorded and immediately triggers a skill state update.

Supported event types:
- `quiz_answered` — Records correctness, response time, confidence rating
- `lesson_completed` — Records completion rate
- `revision_done` — Records performance score and session duration
- `confidence_submitted` — Self-reported confidence (1–5 scale)
- `video_rewatched` — Signals content re-engagement
- `session_started` / `session_ended` / `break_taken`

After each event, the system returns an updated skill state and a recommended next action — making every interaction a feedback loop.

#### 2. ⏱ Session Management (`/api/adaptive/sessions`)
**Purpose:** Tracks study sessions from start to end.

- `POST /sessions/start` — Creates a session and returns a `session_id`. Accepts planned duration and device type.
- `POST /sessions/end` — Closes the session, calculates **focus score** based on interruptions and completion rate.

Focus scores feed directly into the burnout predictor.

#### 3. 🧠 Skill State Engine (`/api/adaptive/state`)
**Purpose:** Returns the student's complete learning state for all skills, with real-time memory decay applied.

Each skill state tracks:
| Field | Meaning |
|---|---|
| `mastery_probability` | BKT-estimated probability the student has mastered this skill (0–1) |
| `memory_strength` | Ebbinghaus retention score — decays with time |
| `forgetting_risk` | `1 - memory_strength` — urgency of revision |
| `stability_factor` | SM-2-style stability; grows with each successful review |
| `confidence_score` | Blended self-rating and performance signal |
| `burnout_risk` | Embedded burnout probability |
| `correct_streak` / `wrong_streak` | Running streaks for pattern detection |
| `next_revision_due` | Scheduled date for next spaced repetition review |
| `avg_response_time_ms` | Average answer speed — proxy for true understanding |
| `difficulty_level` | Current calibrated difficulty band for this student |

#### 4. 🔁 Spaced Repetition (`/api/adaptive/revision-queue`, `/api/adaptive/revision-done`)
**Purpose:** Implements an Ebbinghaus forgetting curve with SM-2-style adaptive interval scheduling.

**Memory model:**
```
R(t) = e^(-t / S)
```
where `t` = days since last review, `S` = stability factor.

**Interval schedule (after each revision):**
| Performance | Interval Multiplier | Stability Change |
|---|---|---|
| ≥ 90% (Perfect) | × 2.5 | × 1.30 |
| ≥ 70% (Good) | × 2.0 | × 1.10 |
| ≥ 50% (Okay) | × 1.3 | × 1.00 |
| < 50% (Poor) | Reset to Day 1 | × 0.80 |

The revision queue is sorted by urgency — overdue skills come first, then by descending forgetting risk. Each item includes a `suggested_duration_minutes` based on the student's current mastery level.

#### 5. 🎯 Adaptive Quiz Engine (`/api/adaptive/quiz`)
**Purpose:** Generates calibrated quiz sessions using Vygotsky's Zone of Proximal Development — questions are always slightly harder than the student's current mastery.

**Question selection strategy:**
- Target difficulty = `mastery + 0.15` (stretch zone)
- Mix: **60% target difficulty**, **20% easier**, **20% harder**
- Never repeats questions seen in the last 7 days
- Allocates more questions to weaker, higher-risk skills
- Shuffles answer options to prevent pattern learning

**Quiz submission processing:**
1. Records each `QuizAttempt` in the database
2. Updates mastery via **Bayesian Knowledge Tracing (BKT)** for each skill
3. Updates per-question statistics (total attempts, correct count)
4. Tracks all events in the event log
5. Returns score summary, updated skill states, and achievement badges

#### 6. 🗺 Skill Graph (`/api/adaptive/skills/graph`, `/skills/weak`, `/skills/unlocked`)
**Purpose:** Manages the Chemistry A/L directed acyclic skill graph. Skills have prerequisite relationships — a student cannot unlock an advanced topic until they've sufficiently mastered its prerequisites.

- **Graph state** — Returns all skills with mastery overlaid: locked, unlocked, in-progress, mastered
- **Weak skills detector** — Ranks skills by weakness score (low mastery + high forgetting risk + wrong streaks) with contributing factor explanations and recommended actions
- **Skill unlocking** — Automatically unlocks skills when all prerequisites reach ≥ 65% mastery

The skill graph is seeded on startup from `CHEMISTRY_SKILLS` data covering all A/L Chemistry units.

#### 7. 💡 AI Recommendations (`/api/adaptive/recommendations`)
**Purpose:** Implements the full `observe → estimate → predict → adapt` feedback loop to generate prioritised, context-aware learning actions.

Action types the engine can recommend:
- `revise_now` — High forgetting risk skill needs immediate revision
- `new_lesson` — Ready to learn an unlocked skill
- `take_break` — Burnout or fatigue signals detected
- `mcq_practice` — Skill at moderate mastery; practise with MCQs
- `review_weak` — Recently failed skill needs focused attention

#### 8. 📅 Daily Plan Generation (`/api/adaptive/daily-plan`)
**Purpose:** Generates a personalised daily study schedule respecting the student's available hours, current mastery state, and burnout risk.

The plan covers the full A/L Chemistry syllabus (Units 1–14) and is broken into three daily blocks:
- **Lesson time** — New content learning
- **MCQ practice** — Multiple-choice exam practice
- **Paper 2 time** — Structured/essay question practice

The algorithm:
1. Filters lessons by available hours vs. total time cost
2. Sorts by syllabus weight and time efficiency
3. Distributes lessons across days proportionally
4. Automatically reduces plan intensity when burnout risk is elevated

#### 9. 🔥 Burnout Predictor (`/api/adaptive/burnout/risk`)
**Purpose:** Rule-based burnout risk estimation designed to detect student overload early and trigger preventive interventions — modelled to simulate Random Forest behaviour.

**Risk signals monitored:**
| Signal | Weight | Threshold |
|---|---|---|
| Long daily study sessions | 20% | Avg > 8 hours/day |
| Extreme single sessions | 15% | Session > 5 hours |
| No rest days | 20% | 14+ consecutive study days |
| High missed targets | 15% | Completion rate < 50% |
| Low engagement | 15% | Focus score < 0.40 |
| Declining performance | 15% | Accuracy drop > 20% |

**Risk levels:**
- `low` (< 0.30) — Sustainable pace
- `moderate` (0.30–0.60) — Monitor closely
- `high` (0.60–0.80) — Reduce workload, mandatory breaks
- `critical` (> 0.80) — Force rest day, urgent alert

Each level generates specific, actionable recommendations (e.g., suggested daily hours, rest day scheduling).

#### 10. 🔍 Personalised Insights (`/api/adaptive/insights`)
**Purpose:** Generates human-readable, personalised learning insights including milestones reached, recurring weaknesses, emerging strengths, performance trends, and early warning alerts.

#### 11. 📊 Learning Dashboard (`/api/adaptive/dashboard`)
**Purpose:** One-call snapshot of the student's entire learning state, aggregated for the frontend dashboard widget.

Returns:
- Overall mastery % across all skills
- Skills mastered count & in-progress count
- Today's study time & week total
- Current study streak (consecutive days)
- Burnout risk score + top recommendation
- Revision queue (top 5 due skills)
- Next recommended action
- Top 3 weak skills
- 5 most recent learning events

#### 12. 🔐 Authentication (`/api/auth`)
JWT-based authentication integrated with Supabase. Validates tokens passed from the Next.js frontend to authorise all adaptive learning API calls.

#### 13. 🔎 Search (`/api/search`)
Full-text search across lessons, skills, and study content to help students quickly find relevant material.

#### 14. 🎬 YouTube Videos (`/api/videos`)
Fetches curated YouTube video recommendations per topic using the YouTube Data API. Transcripts are extracted via `youtube-transcript-api` for additional content indexing.

#### 15. 📖 Learning Content (`/api/learning`)
Serves structured lesson content tied to the skill graph. Returns lessons, associated skills, and learning objectives.

#### 16. 🗓 Study Plan (`/api/study_plan`)
REST endpoints for the multi-month study plan calculator. Takes months available, hours per day, and off-day preferences to generate a full day-by-day study schedule.

### Background Task Queue
Asynchronous jobs (e.g., batch state updates, heavy computations) are queued via **RQ (Redis Queue)** using the `queue_service.py` and `redis_service.py` services.

---

## 📦 Shared Packages

### `packages/shared-auth` (`@teso/auth`)
A shared authentication package consumed by both `Teso` and `Teso-exams-main`. Contains common NextAuth configuration, session types, and utility functions to avoid code duplication across the two Next.js apps.

---

## 🛠 Technology Stack

### Frontend (Teso & Teso Exams)
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 | Full-stack React framework |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| Framer Motion / Motion | 12 | Animations |
| GSAP | 3.14 | Advanced animations |
| Radix UI | Various | Accessible component primitives |
| Recharts | 3 | Data visualisation |
| React Hook Form | 7 | Form management |
| Zod | 4 | Schema validation |
| Socket.IO Client | 4 | Real-time communication |
| Three.js / R3F | 0.18+ | 3D graphics |
| Lottie Web | 5 | Animation playback |
| ReactFlow | 11 | Skill graph visualisation |
| Dagre | 0.8 | Graph layout algorithm |

### Backend (Teso Logics)
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111 | REST API framework |
| Python | 3.11+ | Backend language |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.18 | Database migrations |
| PostgreSQL | — | Primary database |
| Redis | 7 | Caching & task queue |
| RQ | 1.16 | Background job queue |
| Pandas | 2.2 | Study plan computation |
| NumPy | 1.26 | Numerical computations |
| SciPy | 1.13 | Scientific algorithms |
| Pydantic | 2.7 | Data validation |
| `youtube-transcript-api` | 1.2 | YouTube transcript extraction |
| `python-jose` | 3.5 | JWT handling |

### Infrastructure & DevOps
| Technology | Purpose |
|---|---|
| Turborepo | Monorepo build orchestration |
| pnpm Workspaces | Package management |
| Prisma | ORM + migrations for Next.js apps |
| Supabase | Auth infrastructure & storage |
| AWS S3 | Exam paper file storage |
| Redis Pub/Sub | Socket.IO horizontal scaling adapter |
| Node.js Custom Server | Socket.IO integration with Next.js |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 22.0.0
- **pnpm** 10.5.0 — `npm install -g pnpm@10.5.0`
- **Python** 3.11+
- **PostgreSQL** (two separate databases — one for each Next.js app)
- **Redis** running locally on port `6379`

---

### 1. Install JavaScript dependencies

```bash
# From the monorepo root
pnpm install
```

---

### 2. Set up Teso (Study Platform)

```bash
cd Teso

# Copy and fill in environment variables
cp .env.example .env   # or create .env manually (see Environment Variables section)

# Run Prisma migrations
pnpm prisma migrate dev

# Seed the database (optional)
pnpm db:seed

# Start the dev server (runs on http://localhost:3000)
pnpm dev
```

---

### 3. Set up Teso Exams

```bash
cd Teso-exams-main

# Copy and fill in environment variables
# (see Environment Variables section)

# Generate Prisma client
pnpm postinstall

# Start the custom Node.js server (runs on http://localhost:3001)
pnpm dev
```

> ⚠️ The exam platform uses a **custom server** (`server.js`) — do not use `next dev` directly, always use `pnpm dev`.

---

### 4. Set up Teso Logics (Python API)

```bash
cd Teso-logics

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp env.example .env
# Fill in: DATABASE_URL, REDIS_URL, YOUTUBE_API_KEY, SUPABASE_URL

# Run database migrations
alembic upgrade head

# Start the API server (runs on http://localhost:8000)
python -m uvicorn app.main:app --reload
```

The API docs will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 5. Run everything together (from monorepo root)

```bash
# Start both Next.js apps in parallel using Turborepo
pnpm dev
```

> Note: Start the Python API server separately as shown in step 4.

---

## 🔧 Environment Variables

### Teso (`Teso/.env`)

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth
AUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_BUCKET_NAME=...

# Email (Nodemailer)
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=...
EMAIL_SERVER_PASSWORD=...
EMAIL_FROM=noreply@teso.lk

# AI Backend
NEXT_PUBLIC_TESO_LOGICS_URL=http://localhost:8000
```

### Teso Exams (`Teso-exams-main/.env`)

```env
# Database (separate DB from Teso)
NEW_DATABASE_URL=postgresql://...
NEW_DIRECT_URL=postgresql://...

# Auth
AUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Redis
REDIS_URL=redis://localhost:6379

# AWS S3 (for exam paper uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_BUCKET_NAME=...

# Study platform URL (for cross-app linking)
NEXT_PUBLIC_STUDY_PLATFORM_URL=http://localhost:3000
```

### Teso Logics (`Teso-logics/.env`)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/teso
REDIS_URL=redis://localhost:6379/0
YOUTUBE_API_KEY=your_youtube_api_key_here
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🏛 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         TESO Monorepo                            │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │   Teso           │     │   Teso Exams                     │  │
│  │  (Study Platform)│     │  (Exam Hosting Platform)         │  │
│  │  Next.js :3000   │     │  Next.js + Socket.IO :3001       │  │
│  │                  │     │                                  │  │
│  │  ┌────────────┐  │     │  ┌──────────┐  ┌─────────────┐ │  │
│  │  │  Prisma ORM│  │     │  │ Prisma   │  │  Socket.IO  │ │  │
│  │  │  PostgreSQL│  │     │  │ PostgreSQL│  │  Redis Pub  │ │  │
│  │  └────────────┘  │     │  └──────────┘  └─────────────┘ │  │
│  └────────┬─────────┘     └──────────────────────┬──────────┘  │
│           │                                       │             │
│           │  HTTP / REST                          │             │
│           ▼                                       │             │
│  ┌──────────────────────────────────────┐         │             │
│  │   Teso Logics (AI Engine)            │         │             │
│  │   FastAPI / Python :8000             │         │             │
│  │                                      │         │             │
│  │  BKT Mastery · Spaced Repetition     │         │             │
│  │  Adaptive Quiz · Skill Graph         │         │             │
│  │  Burnout Predictor · Daily Planner   │         │             │
│  │  Event Tracker · Recommender         │         │             │
│  │                                      │         │             │
│  │  SQLAlchemy ──► PostgreSQL           │         │             │
│  │  RQ ──────────► Redis ◄─────────────┘         │             │
│  └──────────────────────────────────────┘                       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  packages/shared-auth  (@teso/auth)                       │  │
│  │  Shared NextAuth config used by both Next.js apps         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────┐  ┌────────────────────────┐   │
│  │  Supabase                   │  │  AWS S3                │   │
│  │  (Auth & Storage)           │  │  (File Uploads)        │   │
│  └─────────────────────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📜 License

© 2026 TESO Education. All rights reserved.

---

<div align="center">

**Built with ❤️ for Sri Lanka's A/L students.**

[teso.lk](https://teso.lk) • [exam.teso.lk](https://exam.teso.lk) • [LinkedIn](https://www.linkedin.com/company/110522430/) • [Instagram](https://www.instagram.com/tesoapp_official/) • [Facebook](https://www.facebook.com/profile.php?id=61585551411249)

</div>
