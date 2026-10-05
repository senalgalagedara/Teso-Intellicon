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
