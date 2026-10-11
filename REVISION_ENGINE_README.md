# TESO Revision Engine: Architecture, Algorithms & Implementation Plan

The **TESO Revision Engine** is a classical psychometric and cognitive science engine designed specifically for Sri Lankan G.C.E. A/L students and teachers. It powers adaptive MCQ practice, Bayesian mastery tracking, spaced repetition, attempt error diagnosis, educator item analytics, and cohort Z-score projections.

> **Key Architectural Principle:** The revision engine uses **100% deterministic and probabilistic classical algorithms** (Rasch 1PL IRT, BKT, FSRS, Point-Biserial, Monte Carlo). It does **not** rely on LLMs for core psychometric scoring, question selection, or grading. LLMs are kept in a separate, isolated pipeline (`/api/ai/*`) for auxiliary explanations and text summaries.

---

## 1. Double-Check Verification of Your Algorithm Specifications

Every algorithm and design parameter you listed is **strictly verified, implemented, and mathematically aligned** within this repository:

| Capability Area | Specified Algorithm | Implementation in Repository | Status & Parameters |
| :--- | :--- | :--- | :--- |
| **1. Question Difficulty & Student Ability** | • Elo / Rasch (1PL IRT) (v1)<br>• Adaptive decaying K-factor<br>• 2PL IRT (later roadmap) | [`Agentic/app/engine/algorithms/rasch.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/rasch.py) | **Active (v1)**<br>• $P(\text{correct}) = \frac{1}{1 + e^{-(\theta - b)}}$<br>• $K(n) = \max(K_{\min}, \frac{K_0}{1 + n / n_0})$ ($K_0=0.4, K_{\min}=0.05, n_0=30$)<br>• Clamped to $[-4.0, +4.0]$<br>• Cold start: $1 \to -1.0, 2 \to 0.0, 3 \to +1.0$ |
| **2. Mastery Tracking** | • Bayesian Knowledge Tracing (BKT) (v1)<br>• 4 parameters: prior, learn, guess, slip<br>• DKT / Transformer (later) | [`Agentic/app/engine/algorithms/bkt.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/bkt.py) | **Active (v1)**<br>• Prior $P(L_0) \approx 0.20$, Learn $t=0.15$, Slip $s=0.10$, Guess $g=0.20$<br>• Evaluates $P(\text{mastered})$ per sub-topic<br>• Status: `weak` ($<0.60$), `progressing` ($0.60-0.95$), `mastered` ($\ge 0.95$) |
| **3. Spaced Repetition** | • FSRS (v1) via `py-fsrs`<br>• Difficulty, stability, retrievability<br>• Schedule reviews at ~90% retention | [`Agentic/app/engine/algorithms/fsrs_adapter.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/fsrs_adapter.py) | **Active (v1)**<br>• Uses `py-fsrs` with mathematical fallback scheduler<br>• Rating mapped dynamically: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy) based on latency z-score, correctness, and mastery |
| **4. Adaptive Next-Question Selection** | • Target-probability selection (~70%)<br>• Weighted blend + noise<br>• Fisher Information (later) | [`Agentic/app/engine/algorithms/selector.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/selector.py) | **Active (v1)**<br>• Score $= 0.4 \times (1 - P_{\text{mastery}}) + 0.3 \times \text{diff\_fit} + 0.2 \times \text{due\_bonus} + 0.1 \times \text{novelty} + \mathcal{N}(0, 0.05)$<br>• Random choice among top 3 candidates prevents deterministic loops<br>• Generates human-readable selection reasons |
| **5. Diagnosing Why An Answer Was Wrong** | • Log-normal response time z-score<br>• Fast-wrong vs slow-wrong classification<br>• Distractor analysis | [`Agentic/app/engine/algorithms/diagnosis.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/diagnosis.py)<br>[`Agentic/app/engine/algorithms/item_stats.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/item_stats.py) | **Active (v1)**<br>• $rt\_z = \frac{\ln(\text{latency}) - \mu_{\ln}}{\sigma_{\ln}}$<br>• Correct + fast ($rt\_z < -1.0$) $\to$ `lucky_guess`; Correct $\to$ `solid`<br>• Missed + facility $>0.85$ or fast ($rt\_z < -0.5$) $\to$ `careless_error`<br>• Missed + facility $<0.20$ or slow $\to$ `conceptual_gap`<br>• Distractor option tracking + `hot_distractor` flag |
| **6. Peer Diagnostics (Educator Side)** | • Facility Index (proportion correct)<br>• Discrimination Index (Point-Biserial)<br>• Trap classification | [`Agentic/app/engine/algorithms/item_stats.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/item_stats.py) | **Active (v1)**<br>• Facility $P = \frac{\text{correct}}{N}$ (`too_easy` $>0.90$, `too_hard` $<0.20$)<br>• Point-Biserial $r_{pb} = \frac{M_1 - M_0}{S_n} \sqrt{p \cdot q}$<br>• `suspect_key` if $r_{pb} < 0.0$ for $N \ge 5$<br>• Peer-easy trap ($>85\%$) vs cohort-hard ($<20\%$) |
| **7. Z-Score Projection** | • Per-subject Z-score<br>• 3-Subject Composite Z-score<br>• Monte Carlo projection band (1000 draws)<br>• Island Rank & At-Risk flags | [`Agentic/app/engine/algorithms/zscore.py`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/zscore.py) | **Active (v1)**<br>• $Z = \frac{X - \mu}{\sigma}$ per subject<br>• Composite $Z_{\text{comp}} = \frac{1}{3} \sum Z_i$<br>• Monte Carlo 1,000 simulations yielding $P_{10}, P_{50}, P_{90}$<br>• `island_rank_contender` (top 1% cohort) & `at_risk` ($P_{90} < -0.75$ or any $Z_i < -1.0$)<br>• Caveat: labeled "projected from your cohort" in UI |

---

## 2. Saved Algorithms in This Repository

The core algorithms reside in [`Agentic/app/engine/algorithms/`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/Agentic/app/engine/algorithms/) (and mirrored in `backend/app/engine/algorithms/`):

1. **`rasch.py`**:
   - `p_correct(theta, b)`: Logistic Rasch probability.
   - `k_factor(n, k0=0.4, k_min=0.05, n0=30)`: Decaying learning rate.
   - `update(theta, b, y, n_student, n_question)`: Simultaneous dual Elo updates for student $\theta$ and item $b$.
   - `initial_b(teacher_difficulty)`: Initial difficulty priors from teacher ratings (1, 2, 3).
2. **`bkt.py`**:
   - `update(p_l, correct, g=0.2, s=0.1, t=0.15)`: Standard forward update with Bayesian evidence conditioning and learning transition.
   - `mastery_status(p_mastery)`: Threshold mapping into UI buckets.
3. **`fsrs_adapter.py`**:
   - `determine_rating(is_correct, rt_z, p_mastery)`: Psychometric mapping of performance to FSRS ratings 1–4.
   - `review_card(state, rating_val, review_time)`: Updates retention intervals and outputs next `due_at` timestamp.
4. **`selector.py`**:
   - `calculate_candidate_score(...)`: Multi-objective scoring combining mastery deficit (40%), difficulty proximity (30%), FSRS due-ness (20%), and concept novelty (10%).
   - `select_next_question(...)`: Top-3 randomized sampling with diagnostic explanation tags.
5. **`diagnosis.py`**:
   - `compute_rt_z(latency_ms, median_log_rt, sd_log_rt)`: Log-normal standardization of response time.
   - `classify_attempt(is_correct, rt_z, peer_facility)`: Rule engine categorizing mistakes into careless slips vs deep conceptual deficits.
6. **`item_stats.py`**:
   - `compute_point_biserial(item_correctness, total_scores)`: Pearson product-moment correlation between binary correctness and ability.
   - `analyze_item(attempts, correct_option)`: Comprehensive analysis returning facility, discrimination, distractor distributions, and anomaly flags (`too_easy`, `too_hard`, `suspect_key`, `hot_distractor`).
7. **`zscore.py`**:
   - `compute_subject_zscores(student_scores)`: Cohort standardization.
   - `project_composite_zscore_monte_carlo(subject_stats, n_samples=1000)`: Stochastic modeling of A/L composite distributions ($P_{10}, P_{50}, P_{90}$).
   - `flag_student_zscores(...)`: Automated detection of high flyers and at-risk students.

---

## 3. Architecture: Next.js Frontend/BFF + Python Revision Engine

```
                             ┌─────────────────────────────────┐
                             │       Student / Teacher UI      │
                             │        (Browser / Mobile)       │
                             └────────────────┬────────────────┘
                                              │ HTTPS / Auth Cookies
                                              ▼
                             ┌─────────────────────────────────┐
                             │      Next.js 15 App Router      │
                             │   (Frontend & Backend-For-UI)   │
                             │                                 │
                             │ • Neon Auth Session Guards      │
                             │ • Server Actions & DAL          │
                             │ • Server-side Latency Timing    │
                             │ • Single-statement DB Writes    │
                             └────────┬───────────────┬────────┘
                                      │               │
            Direct SQL Reads & Writes │               │ Internal HTTP (Port 8000)
             (@neondatabase/serverless)│              │ X-Engine-Key: <secret>
                                      ▼               ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────┐
│       Neon Serverless PostgreSQL      │   │       Python FastAPI Backend      │
├───────────────────────────────────────┤   │      (Pure Psychometrics)         │
│ Schema 'app' (Owned by Next.js):      │   ├───────────────────────────────────┤
│ • users, roles, courses, enrollments  │   │ /v1/practice/next                 │
│ • subjects, topics, questions         │   │ /v1/attempts/process              │
│ • question_serves (timestamps)        │◄──┤ /v1/reviews/due                   │
│ • attempts (answers & latencies)      │   │ /v1/students/{id}/progress        │
├───────────────────────────────────────┤   │ /v1/courses/{id}/item-stats       │
│ Schema 'engine' (Owned by Python):    │   │ /v1/courses/{id}/zscores          │
│ • student_ability (theta)             │   │ /v1/admin/jobs/{name}             │
│ • question_rating (difficulty b)      │   └───────────────────────────────────┘
│ • topic_mastery (BKT p_mastery)       │     psycopg 3 async pool
│ • fsrs_card (spaced repetition state) │     Multi-statement ACID transactions
│ • attempt_diagnosis (rt_z & labels)   │     Row-level locking (FOR UPDATE)
│ • engine_processed (idempotency log)  │
└───────────────────────────────────────┘
```

### Separation of Concerns
1. **Next.js (App Router, Server Actions & DAL):**
   - Resolves user identities and checks RBAC permissions.
   - Serves questions **without** revealing `correct_option` or `explanation` to the client.
   - Records the exact server-side timestamp when a question is served (`app.question_serves.served_at`).
   - Receives the student's submission and calculates tamper-proof response latency in SQL:
     ```sql
     latency_ms = LEAST(GREATEST(EXTRACT(EPOCH FROM (now() - s.served_at)) * 1000, 500), 600000)
     ```
   - Inserts the attempt into `app.attempts` first so student progress is **never lost**, then triggers Python asynchronously or synchronously with a 3-second timeout fallback.
2. **Python FastAPI (`Agentic/app` or `backend/app`):**
   - Houses psychometric domain logic and database transactions.
   - Owns the `engine.*` schema.
   - Runs idempotent updates with `FOR UPDATE` row locks to prevent race conditions when rapid answers arrive.
   - Catches up lazily on any unprocessed attempts whenever the student requests their next question.

---

## 4. End-to-End Implementation Plan

To deploy or integrate this revision engine on any Next.js + Python stack, follow these steps:

### Step 1: Database Setup & Migrations
1. Connect to your PostgreSQL database (Neon or standard Postgres).
2. Run the application-side schema:
   - Run [`backend/migrations/0001_engine_schema.sql`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/backend/migrations/0001_engine_schema.sql) to create `engine.student_ability`, `engine.question_rating`, `engine.topic_mastery`, `engine.fsrs_card`, `engine.attempt_diagnosis`, and `engine.engine_processed`.
   - Ensure `app.questions`, `app.question_serves`, and `app.attempts` exist in the `app` schema.

### Step 2: Environment Variables
- **Next.js (`.env.local`):**
  ```env
  DATABASE_URL="postgresql://user:password@pooler-host/db?sslmode=require"
  FASTAPI_BASE_URL="http://127.0.0.1:8000"
  ENGINE_API_KEY="your-production-engine-secret"
  CRON_SECRET="your-cron-secret"
  ```
- **Python FastAPI (`Agentic/.env`):**
  ```env
  DATABASE_URL="postgresql://user:password@pooler-host/db?sslmode=require"
  ENGINE_API_KEY="your-production-engine-secret"
  PORT=8000
  HOST=0.0.0.0
  ```

### Step 3: Next.js Typed Client Integration
Use the dedicated typed client in [`frontend/src/lib/engine/client.ts`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/frontend/src/lib/engine/client.ts):
```typescript
import "server-only";

export const engineClient = {
  getNextQuestion: (studentId: string, courseId: string) =>
    callEnginePost("/v1/practice/next", { student_id: studentId, course_id: courseId }),
  processAttempt: (attemptId: string) =>
    callEnginePost("/v1/attempts/process", { attempt_id: attemptId }),
  getDueReviews: (studentId: string) =>
    callEngineGet(`/v1/reviews/due?student_id=${studentId}`),
  getStudentProgress: (studentId: string, courseId?: string) =>
    callEngineGet(`/v1/students/${studentId}/progress${courseId ? `?course_id=${courseId}` : ''}`),
  getItemStats: (courseId: string) =>
    callEngineGet(`/v1/courses/${courseId}/item-stats`),
  getZScores: (courseId: string, linkedCourseIds?: string[]) =>
    callEngineGet(`/v1/courses/${courseId}/zscores${linkedCourseIds ? `?linked_course_ids=${linkedCourseIds.join(',')}` : ''}`),
};
```

### Step 4: Next.js Server Action Flow
1. **Adaptive Question Fetching** ([`frontend/src/app/actions/practice.ts`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/frontend/src/app/actions/practice.ts)):
   - Check student enrollment in the course.
   - Call `engineClient.getNextQuestion(student.id, courseId)`.
   - Strip `correct_option` and `explanation` from the question payload.
   - Insert into `app.question_serves` with `served_at = now()`.
   - Return `{ serveId, question, reason }` to the UI.
2. **Answer Submission & Diagnosis** ([`frontend/src/app/actions/practice.ts`](file:///c:/Users/user/Desktop/Teso%20ALL/Teso-Intellicon-main/frontend/src/app/actions/practice.ts)):
   - Insert into `app.attempts` calculating latency in SQL.
   - Call `engineClient.processAttempt(attempt.id)` with a 3,000 ms timeout.
   - Return correctness, correct option, explanation, and attempt diagnosis label (`solid`, `careless_error`, `conceptual_gap`, `lucky_guess`).

### Step 5: Automated Maintenance & Scheduled Jobs
Set up a recurring cron job (via Next.js Route Handler `POST /api/cron/engine` or external scheduler):
- **Every hour:** `POST /v1/admin/jobs/refresh_item_stats` to update facility, discrimination, and distractor metrics across questions.
- **Weekly / Nightly:** `POST /v1/admin/jobs/recalibrate_rasch` to re-sequence historical attempts and prevent online Elo drift.

---

## 5. Summary of Future Enhancements
- **2PL IRT:** Introduce discrimination parameter $a_i$ when active cohort reaches $>500$ students per subject.
- **Fisher Information:** Upgrade next-item selector to Maximum Fisher Information (MFI) for computerized adaptive testing (CAT).
- **FSRS Weight Optimization:** Once the platform accumulates $>1,000$ reviews per subject, optimize default 17 FSRS weights via maximum likelihood / Nelder-Mead optimization.
