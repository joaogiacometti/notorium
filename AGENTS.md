# Notorium Agent Guide

Keep only project-specific decisions and recurring gotchas here. Do not add code
inventories, generic style advice, or copies of rules already enforced by checks.

## Commands

Use npm with Node.js 24.

| Task | Command |
| --- | --- |
| Develop | `npm run dev` |
| One test file | `npm run test -- src/path/to/file.test.tsx` |
| All unit tests | `npm run test` |
| Lint / types | `npm run lint` / `npm run typecheck` |
| Size / dead code | `npm run check:size` / `npm run check:deadcode` |

For isolated E2E services and migrations, follow [Development](docs/setup/development.md).

## Read When Relevant

- Before structural or cross-boundary changes: [Architecture](docs/architecture.md).
- Before UI changes: [DESIGN.md](DESIGN.md); reuse its primitives and semantic tokens.
- Before auth, scheduling, deletion, or proposal-lifecycle changes: [Behavior Contracts](docs/behavior-contracts.md).

## Documentation

- Document only what outlasts individual features: core concepts, setup, boundaries,
  and cross-feature decisions. Sub-features and fixes don't belong in docs; tests,
  schemas, constants, and production prompts own that detail.
- When a change removes or replaces one of those (say, subjects or how they work),
  update its owning doc in the same change and delete what is no longer true.

## Server Boundaries

- Client reads use `src/lib/read-api/*`; new JSON read routes use `runUserReadRoute`.
  Server Components read feature queries directly. Reads must not create or repair rows.
- Client writes use Server Actions. Exceptions are the existing image-upload route
  and streaming assistant route; extend AI chat through `/api/assistant/chat` and
  `src/lib/ai/stream-chat.ts`, not another endpoint.
- Use approved-session auth helpers and scope user-owned operations by `userId`.
  UI visibility is not authorization. Use shared Zod schemas and typed results;
  construct client-safe failures with `actionError()`, never raw provider/DB errors.
- Revalidate through `src/lib/server/revalidate-views.ts`. Subject, document-count,
  and flashcard changes refresh the app shell; review grades/undo refresh on exit.
- Share client query keys/options and mutation invalidation through
  `src/lib/client-cache/*`; keep UI state local and server revalidation separate.
- Client reads need an error path: query error state or a caught failure with retry/toast.
- Write cookies through Server Actions, not `document.cookie`.

## Tests and UI Gotchas

- Add regression tests for bugs; prefer failing-first for behavior changes. Assert
  observable behavior, not CSS strings, prompt wording, or implementation call order.
- Client behavior tests must use `.test.tsx`: those run in jsdom with React Compiler.
  `.test.ts` runs uncompiled in Node; DOM-only helpers can opt into jsdom by docblock.
  Use named fakes for external I/O. Do not add another DOM library.
- Reserve Playwright coverage for critical workflows, not presentation-only changes.
- React Compiler is enabled. Avoid manual memoization unless correctness requires it;
  explain the exception. TanStack Table child cells must use `Subscribe` or receive
  state as props, rather than reading state through stable `row`/`table` objects.
- Shortcut changes must update `src/lib/shortcuts/registry.ts` and its tests.

## Database and Release Safety

- Keep `src/db/schema.ts` together; it is intentionally exempt from the size guard.
- Never hand-edit `drizzle/*.sql` or `drizzle/meta/*`. Schema changes need
  `npm run db:generate` and `npm run db:migrate`; preserve production compatibility.
- Before committing or pushing schema/migration changes, ask whether to generate
  and include migrations and whether production rows need cleanup or backfill.
  A push to `main` touching schema/migrations triggers production migration.
- Keep secrets server-only and out of client results, exports, logs, and fixtures.
  Stored secrets must be encrypted; exports exclude auth/session/account tables.

## AI Changes

- Keep prompts and tool/schema descriptions general. Never put fixture material,
  debugging conversations, or canned study examples into production model requests.
- Dynamic context comes only from the current user's request, conversation, settings,
  subjects, active material, and authorized results. Audit actual model-visible
  messages and schemas; comments and test helpers must not become model context.

## Automated Guards

- Do not weaken Biome boundaries, size limits, or Knip checks to pass a change.
- Remove orphaned code/dependencies instead of adding ignores; justify verified false positives.
- Run checks relevant to the change; report what ran and anything left unverified.

## Commits

- Commit only when asked, using Conventional Commits.
- Stage only the requested work; never discard unrelated edits.
- Report the commit hash and remaining worktree changes.
