# Verification record — 6 October 2026

- 59 automated tests pass: temporary databases, mocked providers and storage.
- Next.js production build and ESLint pass.
- Live AI/ML API smoke: `gpt-4o-mini`, Bearer authentication and strict JSON schema;
  response passed application validation. A schema improvement constrained
  evidence references to the imported question/resource IDs after the initial
  response failed that check.
- The additive assessment migration and development fixture were applied to the
  configured Neon database, without resetting or altering existing application
  tables. Development results are explicitly excluded from success rates.
- The live HTTP demo passed through Next.js → signed identity bridge → FastAPI →
  Neon → durable job → AI/ML API → saved results. Its grade was 2/5 (40%): one
  correct, one incorrect, one unanswered. All three question feedback records
  were `ai_generated`, with analysis state `completed`.
- A second HTTP client retaining the authorised cookie reopened the same result.
  Duplicate submission returned the same grade and job. Anonymous result access
  and a cross-origin demo request were rejected. Population percentages were null.
- FastAPI was stopped and restarted; the saved Neon score and all three live
  feedback records remained retrievable.

Browser automation was unavailable, so rendered visual/interaction checks were
not performed. A real student's Neon account sign-in was not exercised; the live
demo used a server-issued development identity. Real private image retrieval and
vision requests require storage credentials and approved image objects that were
not present; those paths were verified with mocked storage/provider responses.
The fixture needs team review and real published content before student rollout.

`npm audit` reports five high-severity findings in the existing Next.js ESLint
development dependency chain (`braces` was already version 3.0.3 in the original
lockfile). An automatic fix proposes downgrading the Next.js lint configuration;
no unrelated framework downgrade was made.
The production-dependency audit (`npm audit --omit=dev`) reports zero findings.

## Separate-service layout verification

The Python source, AI/ML adapter, worker, migrations, fixtures and tests now live
in `Agentic/`. Its virtual environment was recreated at the new path. The Python
suite now has 63 passing tests, including portable startup and production
configuration checks. Next.js build and lint pass after all Python proxies were
updated to use server-only `FASTAPI_BASE_URL`. The independently started
`Agentic` API responded to health requests and was reached through Next.js.
The assessment HTTP demo also passed after relocation, using explicitly labelled
mock feedback: 2/5 (40%), idempotent submission, saved-result refresh and rejected
unauthorised access. The AI/ML adapter and credentials were moved unchanged; the
earlier live-provider verification remains recorded above.

The container definition is provided but not build-tested: Docker Desktop's
Linux daemon was unavailable in this session. No external hosting deployment
was performed.


## Main frontend integration and personalized learning

- Pulled and merged `origin/main` into `Nraj_Dev`, preserving the team Neon Auth, role guards, teacher approvals, courses and invitations. Assessment requests now use the same student role DAL.
- 74 automated tests pass, including adaptive topic coverage, fresh/repeated questions, content language boundaries, stable concurrent follow-up creation, saved history after reconnecting, improvement evidence, migration backfill, and targeted demo worker isolation.
- Next.js production build and ESLint pass. The workspace-root warning is resolved. Independent deployment URL validation runs at request time and does not block a local production build.
- Additive migration 002 and English/Sinhala/Tamil development banks applied to the configured Neon database. Team role/course tables are present and preserved.
- HTTP integration with a server-issued development identity passed through Next.js and Python using Neon: initial paper 2/5 (40%); personalized follow-up 7/7 (100%) on five fresh questions; two saved history entries with topic improvement; repeated creation returned the same follow-up. These are synthetic verification results, not real student improvement claims.
- The integration used labeled mock feedback for these new jobs and targeted only its own sessions. The earlier live AIML feedback verification remains valid; new adaptation makes no AI-provider requests itself. Anonymous access and cross-origin mutations were rejected, and refresh preserved results/history.
- Subject/language selection, sign-in continuation, question review and timeline rendering compile successfully. Browser interaction/visual QA and a real student's Neon sign-in remain unverified. Development content and translations need review before production use.
- Topic/result/catalog queries now batch related records, and frontend polling waits for each response to avoid overlapping requests on a remote database.

## Multilingual content, images and ML preparation

- 124 automated Python tests pass. The added checks cover catalog migration preservation, relational constraints, language/version grouping, private theory images, changed-image rejection, temporal ML features, first-exposure filtering, pseudonymous identifiers and safe offline exports.
- Next.js production build and ESLint pass with theory-image rendering in submitted results.
- Additive migration 003 was applied to the configured Neon database using its direct endpoint. Verification confirmed that baseline content, submitted sessions, final responses and saved learning records were unchanged.
- The catalog contains three languages, three subject-language versions, three topics, 30 question versions/families, 90 answer choices and nine theory sections. One configured private-bucket registry row was added. There are no imported image objects or image links in this database yet; image and vision paths remain verified with mocks.
- An opt-in offline JSONL exporter separates prediction features from labels and metadata. Features use outcomes available before the target session started; earlier presentations include unfinished sessions. Development examples, known assistance and repeated question families are excluded by default. No real student dataset was exported and no predictive model was trained.
- Browser interaction/visual checks and a real student's Neon sign-in remain unverified. Existing development content and translations still require team review before production use.
