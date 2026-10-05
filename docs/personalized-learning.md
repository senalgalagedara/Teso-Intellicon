# Personalized follow-ups and learning history

The landing page links to `/exams/self-assessment`. A student signs in using the team's Neon Auth screens, then chooses a subject, an available paper language, an explanation language, and a published paper. Language metadata describes the actual paper content; changing explanation language does not translate questions. The development demo has English, Sinhala and Tamil Physics banks and remains separate from real student identities.

Python grades against immutable answer keys. It persists the final answers, score, durable analysis job, and learning snapshot in one transaction. AI feedback can explain an incorrect selection and link supplied theory; it cannot change marks or invent a student misconception. Results remain available when the provider fails. A separate worker must run to complete queued feedback.

## Follow-up selection

`GET /api/assessments/sessions/{id}/recommendation` returns a server-computed plan. `POST .../next` accepts only `{ "question_count": 10 }` (1–50); student IDs, answer keys and custom membership are not accepted. Selection uses published, accessible question versions from the same subject and content language, with the same content development status.

The deterministic strategy `weak-concepts-and-retention-v1` uses the student's latest completed evidence per concept. It aims for approximately 60% questions on incorrect or unanswered theory, 20% revisiting previously correct concepts, and fills the remainder with available coverage. It rotates topics within the quota, prefers unseen questions within each topic, and uses older, less frequently attempted versions when repetition is necessary. Missing target questions change the proportions. There is no generated/unreviewed production question bank or promise of an optimal learning policy.

The plan persists with the exact question versions, selection reasons, source assessment, strategy, and repeated-question flags. The session's presented membership is the grading snapshot. Each source assessment has one follow-up: repeat or concurrent creation reopens that same session, and its plan stays stable as the question bank grows. Subsequent completed follow-ups can generate the next link in the sequence.

Small banks return fewer questions and explicit repetition warnings. Adaptive sessions are labeled `adaptive_practice`; they do not contribute to independent first-response population success rates. A later independent attempt after prior practice on the same question version is also excluded.

## Saved evidence and improvement

`GET /api/assessments/history` returns only the authenticated student's submitted learning snapshots, ordered newest first, and topic timelines grouped by concept and paper language. Each attempt records:

- Score and submission time, paper, explanation/content languages, and activity type.
- Correct, incorrect and unanswered counts and weighted marks per theory topic.
- Question versions missed, supplied theory resource references, and prior question exposure.
- The follow-up plan when present.

The UI shows first/latest topic percentages, changes in percentage points from previous and first evidence, consecutive attempts with missed questions, and links back to each paper's explanations and theory. Drafts do not contribute. Percentage differences describe performance on those questions: different difficulty, coverage, and repeated answers limit comparability. The service does not infer long-term mastery or guarantee a top exam success rate.

## Migration and verification

Run `python -m app.assessment.cli migrate` from `Agentic/`. Migration 002 creates `teso_session_plans` and `teso_learning_records`, backfills old submitted assessment evidence, and records version 2. The SQL file documents new tables; the CLI is the canonical operation because it performs the backfill too. Existing roles/courses tables and assessment answers are preserved. Restart any older worker after updating its code.

Tests cover fresh-question selection, topic coverage, retention, language boundaries, concurrent/idempotent creation, immutable snapshots, grading follow-ups, unanswered evidence, persisted history after reconnecting, ownership, repeat warnings, migration backfill, and statistics exclusion. Development fixtures remain explicitly unreviewed and require academic and translation review before rollout.
