# GitHub issue audit — 6 October 2026

All issues were retrieved through authenticated GitHub REST, including closed issues. The repository has **30 issues: 29 open, one closed**. There are no open pull requests; authentication PR #31 and Nraj_Dev PR #32 are merged. No issue status, comment or label was changed during this review.

The assessment/database baseline is commit `4862f23`. This follow-up also adds the illustrated student dashboard. Implementation classifications describe code that exists, not production acceptance: **10 core behaviors implemented, 10 partial, 10 missing**. In particular, scores and topic evidence are not calibrated mastery or retention estimates.

| Issue | GitHub state | Implementation | Evidence and remaining work |
| --- | --- | --- | --- |
| [#1 Extract questions and answers](https://github.com/senalgalagedara/Teso-Intellicon/issues/1) | Open | Missing | No PDF/image extraction, structured validation, teacher review queue or reviewed catalog import pipeline. The legacy document route performs generic text analysis. |
| [#2 Design database](https://github.com/senalgalagedara/Teso-Intellicon/issues/2) | Open | Partial | Assessment schema and catalog migrations 001–003 provide subjects/topics, languages/versions, answer choices, theory/images, attempts and history. Add explicit question-type metadata and versioned calibrated difficulty for the proposed revision engine. |
| [#3 Question difficulty calculation](https://github.com/senalgalagedara/Teso-Intellicon/issues/3) | Open | Missing | No Elo/Rasch rating state, fitting, calibration or evaluation. Facility percentages are already available but do not implement this model. |
| [#4 Question facility percentage](https://github.com/senalgalagedara/Teso-Intellicon/issues/4) | Open | Implemented | `service.success_rates` calculates numerator/denominator, sample label, eligible first responses and a nullable percentage; development/practice examples are filtered. |
| [#5 Student performance aggregation](https://github.com/senalgalagedara/Teso-Intellicon/issues/5) | Open | Partial | Results and saved history aggregate marks, topics, attempts and change in observed scores. Response-time aggregation and a dedicated subject summary remain missing. |
| [#6 Educator item-performance API](https://github.com/senalgalagedara/Teso-Intellicon/issues/6) | Open | Missing | Teacher screens manage courses and rosters; there is no authorized cohort item-statistics API. |
| [#7 BKT mastery tracking](https://github.com/senalgalagedara/Teso-Intellicon/issues/7) | Open | Missing | No Bayesian knowledge state, fitted parameters or validation. Current topic scores are evidence from answered questions. |
| [#8 Adaptive question selector](https://github.com/senalgalagedara/Teso-Intellicon/issues/8) | Open | Partial | `learning.recommend` balances missed theory, earlier knowledge and fresh questions. Integrate calibrated difficulty/mastery and family-level exposure: current adaptation follows version IDs and completed attempts. |
| [#9 Weak-topic detection](https://github.com/senalgalagedara/Teso-Intellicon/issues/9) | Open | Partial | Latest missed questions, topic scores and consecutive missed attempts are saved; the dashboard shows revision priorities. A calibrated mastery estimate and configurable recent-evidence weighting are absent. |
| [#10 Response-time analysis](https://github.com/senalgalagedara/Teso-Intellicon/issues/10) | Open | Missing | Nullable active-duration metadata is accepted, but the UI does not capture it. Implement visibility-aware timing before interpreting fast/slow incorrect answers. |
| [#11 FSRS integration](https://github.com/senalgalagedara/Teso-Intellicon/issues/11) | Open | Missing | No FSRS scheduler, review state or due dates. |
| [#12 Revision schedule generator](https://github.com/senalgalagedara/Teso-Intellicon/issues/12) | Open | Missing | Existing next-paper plans are immediate selections; dated revision tasks and scheduling are absent. |
| [#13 Adaptive practice session](https://github.com/senalgalagedara/Teso-Intellicon/issues/13) | Open | Implemented | Owned `/sessions/{sid}/next` persists adaptive composition and opens the assessment UI with selection/repetition provenance. |
| [#14 Post-question explanations](https://github.com/senalgalagedara/Teso-Intellicon/issues/14) | Open | Implemented | Durable worker feedback includes explanations, worked solutions, selected-option analysis and revision actions; reviewed fallback preserves the grade. |
| [#15 Student performance dashboard](https://github.com/senalgalagedara/Teso-Intellicon/issues/15) | Open | Partial | New `/student` dashboard has a study illustration, real completed-paper metrics, language-specific latest topic evidence, recent-result links and courses/invitations. Saved history is available. Dated revision tasks and measured retention still depend on the missing scheduler/model work. |
| [#16 Memory re-test workflow](https://github.com/senalgalagedara/Teso-Intellicon/issues/16) | Open | Missing | No due-review queue or automatic scheduled re-test trigger. |
| [#17 7-/14-day retention tests](https://github.com/senalgalagedara/Teso-Intellicon/issues/17) | Open | Missing | No interval assignments, delayed re-tests or measured retention. An immediate follow-up is not a delayed retention test. |
| [#18 Student/teacher/admin authentication](https://github.com/senalgalagedara/Teso-Intellicon/issues/18) | Closed | Implemented | Neon Auth, persisted role guards, teacher approvals and invitations, plus the signed Python identity bridge. Real-account browser verification remains pending. |
| [#19 Homepage with Exams section](https://github.com/senalgalagedara/Teso-Intellicon/issues/19) | Open | Partial | Intro, benefits and direct self-assessment entry exist. The specified Exams section and button scrolling to it are absent. |
| [#20 Self-Assessment entry page](https://github.com/senalgalagedara/Teso-Intellicon/issues/20) | Open | Implemented | Exams/self-assessment entry explains the process, provides sign-in continuation and offers paper selection. |
| [#21 Learning-source selection](https://github.com/senalgalagedara/Teso-Intellicon/issues/21) | Open | Missing | No Enrolled Classes / Tuition Providers / Free Resources selector or source-to-paper/access association. Enrollment currently lives separately. |
| [#22 Subject/paper selection](https://github.com/senalgalagedara/Teso-Intellicon/issues/22) | Open | Partial | Subject, paper language and published-paper selection work. Source/course/provider filtering depends on #21. |
| [#23 Assessment instructions](https://github.com/senalgalagedara/Teso-Intellicon/issues/23) | Open | Partial | Question count and final-submission notice exist; add a pre-start instructions step and explicit duration/marking rules. |
| [#24 Exam UI with persistence](https://github.com/senalgalagedara/Teso-Intellicon/issues/24) | Open | Partial | Questions/options, clear-answer control, answered count and explicit server drafts work. Add question navigation, answered indicators, timer and automatic draft saving before refresh. |
| [#25 Python submission integration](https://github.com/senalgalagedara/Teso-Intellicon/issues/25) | Open | Implemented | Idempotent submission, durable grade/job, analysis polling, failure feedback and saved-result reopening. |
| [#26 Result summary](https://github.com/senalgalagedara/Teso-Intellicon/issues/26) | Open | Implemented | Marks, percentage, correct/incorrect/unanswered counts and concept revision evidence. |
| [#27 Question review](https://github.com/senalgalagedara/Teso-Intellicon/issues/27) | Open | Implemented | Student/approved answers, options, explanation and related theory/resources, including private theory-image support. |
| [#28 Success-rate statistics](https://github.com/senalgalagedara/Teso-Intellicon/issues/28) | Open | Implemented | Percentage, numerator/denominator, eligible population label and honest no-data state. Small-sample wording can still improve. |
| [#29 Next-study recommendations](https://github.com/senalgalagedara/Teso-Intellicon/issues/29) | Open | Implemented | Topic-to-theory links, approved resources and personalized next-paper start. |
| [#30 Complete journey verification](https://github.com/senalgalagedara/Teso-Intellicon/issues/30) | Open | Partial | 124 Python tests and prior HTTP integration checks cover saved scores, feedback and history. Frontend build/lint and focused rendered-component checks pass. Real Neon account sign-in and actual desktop/mobile browser interaction checks remain pending. |

## Recommended implementation order

1. Finish the student assessment journey: learning-source data/access associations (#21/#22), pre-start instructions (#23), question navigation and automatic drafts (#24), homepage Exams entry (#19), and real-account/mobile verification (#30).
2. Import teacher-reviewed **non-development** English/Sinhala/Tamil banks with explicit translation families. Configure approved private image objects and verify a real image/vision request. Current database content is development-only; real accounts correctly cannot start those sample papers.
3. Capture active answer timing reliably, aggregate it (#10/#5), and add scoped educator statistics (#6). Integrate family exposure into adaptive selection before treating translated questions as fresh evidence.
4. Evaluate difficulty and mastery models (#3/#7), then integrate their versioned outputs into selection and revision priorities (#8/#9). The optional ML exporter prepares rows; it does not train or validate a model.
5. Implement scheduled reviews and delayed retention measurement (#11/#12/#16/#17). The dashboard can then show genuine due tasks and retention evidence.

## Public Python deployment gap

The assessment routes require a signed identity. The legacy template routers in `Agentic/app/routers/ai.py` and `documents.py` still expose `/api/ai/chat`, `/api/ai/analyze`, `/api/ai/embeddings`, and `/api/documents/process` without an authentication dependency. Protect or disable them before making the Python host public. This finding does not describe the separately authenticated assessment routes.

## What changed in this follow-up

`/student` is now an illustrated learning dashboard; student visits to `/dashboard` continue there. It retains teacher invitation accept/decline actions and enrolled/declined courses. Progress fetches the existing signed, private, same-origin history API and offers loading, empty, sign-in, error and retry states. It excludes development attempts and uses each topic's latest evidence separately for each paper language. No fabricated score, mastery estimate or scheduled task is displayed.

A signed-in student's identity now takes precedence over an old development-demo cookie, and other signed-in roles cannot use that cookie to access student assessment routes. Anonymous local development demos remain supported.

See [illustration source and generation prompt](student-dashboard-assets.md) and the [verification record](assessment-verification.md). The issue states above were read only and remain unchanged.
