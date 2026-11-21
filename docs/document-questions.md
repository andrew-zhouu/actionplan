# Ask documents (RAG prototype)

This change adds `/app/ask` and `POST /api/ask` to the existing ActionPlan app.
Users select up to five completed documents and receive short answers with
expandable, verbatim source quotations and links to the original documents.

## Implementation

- Overlapping, boundary-aware chunks (up to 1,800 characters, 240-character overlap).
- Gemini `gemini-embedding-001` embeddings, 768 dimensions, with separate document/query task types.
- Native Turso/libSQL vector columns and exact cosine search, filtered by session owner and selected document IDs **before** ranking. This deliberately avoids a global approximate index that could let unrelated users' data crowd out the selected documents.
- Cached embeddings keyed by a hash of the exact text, model, dimensions and chunking version. Existing documents are indexed on their first question; failed indexing can be retried.
- Anthropic answers validated against a Zod schema. Every claim must cite a retrieved source ID and an exact substring. Invalid answer formatting/citations receive one retry and then an error. No matches or a model abstention produces an insufficient-evidence message.
- Atomic index replacement, ownership checks before provider calls, and source revalidation before returning an answer. Deleting a document also removes its passages and embeddings.
- Persistent per-user request lease, 5-second cooldown and 30 requests/hour. A selected set can contain at most 160 chunks and each document at most 80,000 characters. Oversized selections are rejected, never silently truncated.
- Logs contain timing and chunk counts, not source text, questions, answers or credentials.

The similarity cutoff (0.35) is an initial heuristic, not a calibrated confidence
score. Verbatim citation validation proves that a quote exists; it does **not**
prove the model's claim follows from it. Retrieved passages are not exhaustive.
The UI makes these limits clear. No generated answer performs an action for the user.

## Enable on the existing deployment

1. Install dependencies with `npm ci` (Node 22+).
2. Keep the app's existing database URL/token, `SESSION_SECRET`, and
   `ANTHROPIC_API_KEY` configuration. Add a server-only `GEMINI_API_KEY` from the
   intended Google account/project. Review the applicable data-use terms for
   that project's API tier before enabling it for real customer documents.
3. Run the additive migration using the intended environment:

   ```sh
   npm run db:rag
   ```

   This loads `.env.local` if present and uses `DATABASE_URL` /
   `DATABASE_AUTH_TOKEN`, or the existing Vercel Turso integration variable names.
   It adds only the RAG tables/indexes, preserves all existing data, and can be rerun.
   On a new local database, initialize the base app schema with `npm run db:push` first.
   The old `scripts/migrate-remote.mjs` is not a complete current base-schema migration.

4. Set `RAG_ENABLED=true` and deploy the branch through the repository actually
   connected to ActionPlan's Vercel project. The two historical GitHub repositories
   `actionplan` and `actionplan-vercel` do not automatically sync.
5. Sign into a preview environment, analyze two synthetic documents, visit
   **Ask documents**, and verify a cited answer and an unsupported question.
   Check that source links open the correct original documents. Start with
   synthetic content rather than private customer documents.
6. Run `npm run eval:rag` with real model keys for a small live synthetic check.
   This sends only the fixtures in that script, uses a temporary local database,
   incurs provider usage, and must not be presented as a broad quality benchmark.

To disable new questions, remove `RAG_ENABLED` or set it to `false`. Existing
analyses remain available. Do not drop the new tables to disable the feature.

Gemini API integration is not a Google Cloud Run deployment. Do not describe
this change as GCP infrastructure experience or as a production launch until
those actions actually occur.

## Verification completed in this workspace

- `npm run test:rag`: 13 tests passed. Uses actual file-backed libSQL databases
  and native vector distance; model outputs/embeddings are controlled fixtures.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; includes the new page and API route.
- Production-server HTTP checks: unauthenticated request 401, unauthorized
  document 404, foreign origin 403, invalid input 400, oversized body 413,
  authenticated question page 200 with the correct fixture document titles.
  No model calls were made by those checks.
- ESLint on new files and edited backend/document/privacy files: passed.
- Repository-wide lint still reports 8 existing errors and 5 existing warnings
  in unrelated code and the pre-existing sidebar effect. The one added sidebar
  entry did not introduce that effect.
- Browser UI verification and live Gemini/Anthropic evaluation: **not completed**.
  Local browser binaries were unavailable and their download was blocked; the
  cloud browser could not reach the local server. No live provider keys are present.
- Deployment and GitHub push: **not completed**; authenticated access is absent.

## Resume wording at the current verification level

> Built a cross-document RAG prototype with cached embeddings and Turso vector search; added owner-scoped retrieval, verbatim source citations, insufficient-evidence handling, and automated retrieval/access-control tests.

This replaces the third ActionPlan bullet. Keep the first two bullets about
deterministic extraction/schema validation and asynchronous processing/storage.
Do not add user adoption, accuracy, latency improvements, or production-scale claims.

## Application skills

Remove lower-priority/redundant tags for this engineering application:
Product Ideation, Product Management, Product Strategy, Presentation Skills,
GitHub (keep Git).

Use the available equivalents of API Integration, Backend Development,
Asynchronous Programming, Retrieval-Augmented Generation (RAG), and Vector
Databases. The last two describe the implemented/tested prototype, not production
expertise. Do not add GCP based only on using the Gemini API.
