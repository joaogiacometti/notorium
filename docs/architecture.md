# Architecture

For contributors changing module boundaries or cross-feature flows. Keep this an
overview of responsibilities and design rationale, not a catalog of helpers or UI
behavior. Update it when those boundaries or decisions change.

## System Context

Notorium is a knowledge editor built as a Next.js application with server-rendered
pages and interactive client editors. Folders organize notes, PDFs, and flashcards
in a user-owned hierarchy. PostgreSQL stores user records and material
through Drizzle; Redis
or Upstash supplies rate limiting. Required integrations are OpenRouter for AI,
Vercel Blob for private media, and Resend for email. AI requests send conversation
and active material text to OpenRouter and the selected provider. Scheduled HTTP
jobs, triggered by [GitHub workflows](../.github/workflows), perform FSRS
optimization and orphan-file cleanup.

Local development runs the app alongside Compose-managed PostgreSQL and Redis;
deployment uses configured backing services. Setup belongs in the [README](../README.md);
[`.env.example`](../.env.example) lists the configuration.

## Module Responsibilities

| Location | Responsibility |
| --- | --- |
| `src/app/` | Routing, server-rendered composition, and thin HTTP/action boundaries |
| `src/components/` | Feature UI and shared components; `ui/` contains shadcn primitives |
| `src/features/` | Domain reads, writes, validation, and feature-local algorithms |
| `src/db/` | Drizzle schema, relations, and database client |
| `src/lib/` | Shared infrastructure and project-owned service adapters |
| `src/env.ts` | Runtime configuration validation |

## Main Data Flows

```text
Server-rendered read: page -> feature query -> Drizzle -> PostgreSQL
Client read: component -> typed read-api fetcher -> GET route -> feature query
Client write: component -> Server Action -> feature mutation -> database
AI message: assistant workspace -> POST /api/assistant/chat -> assistant service
            -> shared AI streaming layer -> OpenRouter
AI proposal acceptance: editor/create controls -> normal client write flow
Scheduled job: authenticated HTTP route -> feature operation
```

Authentication and validation belong at server boundaries; feature operations scope
user-owned records by the authenticated user. Intended access guarantees and known
verification gaps live in [Behavior Contracts](./behavior-contracts.md).

## Boundary Decisions

- **Auth HTTP exposure is opt-in.** Authentication mutations use Server Actions
  and Better Auth's internal `auth.api`. A request-only
  [policy](../src/lib/auth/http-policy.ts) blocks direct auth HTTP endpoints except
  the password-reset email callback, so they cannot bypass app approval, quota,
  or account-cleanup rules. New auth integrations must explicitly allow any
  required HTTP callbacks.
- **Reads and writes stay separate.** Server Components read feature queries
  directly; client reads use [typed fetchers](../src/lib/read-api/) and the shared
  [read-route wrapper](../src/lib/server/read-route.ts). GETs do not create or repair
  records. Server Actions serialize per client and use POST, so routing reads through
  them would queue independent reads behind writes.
- **Client server data shares one cache.** The authenticated layout owns a
  QueryClient keyed by user identity. Resource keys and reusable query options
  live in `src/lib/client-cache/`; successful folder, document, and flashcard
  writes use its shared invalidation policies. The sidebar tree and folder
  pickers observe that cache instead of maintaining separate fetched copies or
  broadcasting refetch events. Expansion, selection, and editor drafts stay local.
  Client invalidation and server view revalidation are separate responsibilities.
- **Writes share one domain layer.** Actions authenticate, validate, delegate, and
  return typed results. Revalidation goes through [one view adapter](../src/lib/server/revalidate-views.ts).
  Review grades and undo defer shell refresh until exit: refreshing per grade adds
  work to the serial queue and can redirect an active session once no cards are due.
- **Large media bypasses action bodies.** Images use the bounded multipart upload
  route; PDFs upload directly to private storage with a scoped short-lived token,
  then a Server Action verifies the stored object before creating its record.
  Private reads check ownership and support byte ranges for PDF loading.
- **AI streaming has one entry point.** The assistant service owns prompts and tools;
  [the AI layer](../src/lib/ai/) owns provider access and streaming. A streaming route
  avoids holding the Server Action queue for an entire reply. Creation/edit tools
  propose changes rather than writing; user approval returns through normal writes.
- **Assistant state belongs to the app shell.** Editors and study surfaces register
  context with one workspace; moving its presentation into a dialog does not create
  another conversation. Draft session/revision checks prevent late proposals from
  overwriting newer edits. Note and flashcard edits share session ownership,
  ordered proposal delivery, and settlement; their editor-specific hooks own
  validation and acceptance. Material is untrusted context, not system instructions.

Import restrictions in [biome.json](../biome.json) enforce the read/write boundaries.
Detailed contributor rules belong in [AGENTS.md](../AGENTS.md), not here.

## Cross-Cutting Constraints

- **Deletion has different lifetimes.** Historical review logs survive card/folder
  deletion. Shared media is reclaimed by a reference-aware sweep rather than deleted
  with one document; account deletion purges owned files. See [Behavior Contracts](./behavior-contracts.md).
- **Hierarchy moves need concurrency protection.** Folder moves validate and update
  under a per-user transaction lock so overlapping moves cannot create cycles;
  [folder mutations](../src/features/folders/mutations.ts) own that coordination.
- **Rich text has one document model.** Notes and card faces store versioned
  Tiptap JSON, validated against the supported schema at write boundaries.
  Editors and autosave carry documents directly. HTML, Markdown, and plain text
  are derived exchange formats; assistant fragments are imported at acceptance,
  and unaffected note blocks retain their original nodes. Search text is derived
  in the same write as its document, never repaired during reads.
- **Editor and renderer must share formats.** Their extension sets and math helpers
  live in [editor infrastructure](../src/lib/editor/) and [math infrastructure](../src/lib/math/).
  Diverging schemas can silently discard stored nodes. Autosave is an in-memory
  write queue, not offline persistence or cross-tab conflict resolution.
- **Search must match its indexes.** [Shared SQL builders](../src/features/search/match-sql.ts)
  use the same accent-folding expression as the database indexes; different wrapping
  can prevent index use. Schema and migrations own the exact database definitions.

Product intent and unresolved risks: [Behavior Contracts](./behavior-contracts.md).
Visual conventions: [DESIGN.md](../DESIGN.md). Checks and test setup:
[Development](./setup/development.md).
