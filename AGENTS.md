# Notorium Agent Guide

This file is for agents. Keep it short, direct, imperative, and focused on what prevents mistakes.

## Project Facts

- Stack: Next.js App Router, React, TypeScript, Drizzle ORM, Better Auth, Zod, React Hook Form, shadcn/ui, Tailwind CSS 4, Biome, Bun, PostgreSQL, Redis.
- Use Bun. Do not use npm.
- Format and lint with Biome.
- `SPEC.md` is the product behavior source of truth.
- `README.md` owns setup, runtime commands, and high-level architecture.
- `docs/` owns narrow setup, operations, and historical planning notes.

## Code Style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module.
- Names: specific and unique. Avoid `data`, `handler`, `Manager`, and other vague names.
- Prefer names that return fewer than 5 grep hits in the codebase.
- Types: explicit. No `any`, no broad `Dict` aliases, no untyped functions.
- No code duplication. Extract shared logic into a function or module.
- Use early returns over nested conditionals.
- Keep indentation to 2 levels maximum.
- Exception messages must include the offending value and expected shape.
- No `console.log` in production code.

## Comments

- Keep existing comments during refactors. They carry intent and provenance.
- Write WHY, not WHAT. Skip comments like `// increment counter` above `i++`.
- Public/exported functions need docstrings with intent and one usage example.
- Reference issue numbers or commit SHAs when code exists because of a specific bug or upstream constraint.

## Tests

- Tests run with one command: `bun run test`.
- Every new function gets a test.
- Bug fixes get a regression test.
- Mock external I/O, APIs, DB, and filesystem with named fake classes or helpers, not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable, self-validating, timely.
- Keep Vitest tests next to source with `.test.ts` or `.test.tsx`.
- Add Playwright coverage only for critical user workflows: navigation, auth/permissions, writes, persistence, destructive actions, or cross-page flow integrity.
- Do not add Playwright tests for presentation-only changes unless explicitly requested.

## Dependencies

- Inject dependencies through parameters or constructors where practical.
- Wrap external services and volatile third-party APIs behind thin project-owned interfaces.
- Direct imports are fine for stable framework and utility libraries: React, Next.js, shadcn/ui, Drizzle query helpers, Zod, date-fns, and local UI primitives.

## Structure

- Follow Next.js App Router conventions.
- Prefer small focused modules over god files.
- Use predictable paths.
- Feature folders live in `src/features/[feature-name]/`.
- Components live in `src/components/[feature-name]/` or `src/components/shared/`.
- shadcn primitives live in `src/components/ui/`; do not edit them manually.

Standard feature shape:

```text
features/[feature-name]/
  queries.ts
  mutations.ts
  validation.ts
  mappers.ts
  types.ts
  utils.ts
  constants.ts
```

Only add optional files when they are needed.

## Next.js Boundaries

- Use Server Components by default.
- Add `"use client"` only when browser state, effects, or event handlers are required.
- Server Actions in `src/app/actions/` are the only client-callable server boundary.
- Client Components call server code only through Server Actions.
- Server Components read from `src/features/*` directly.
- Do not call Server Actions from Server Components.
- Keep Server Actions thin: authenticate, validate, delegate, revalidate, return typed result.
- `src/app/actions/*` must not import `@/db/index` directly unless the exception is documented.
- Keep read logic in `src/features/*/queries.ts`.
- Keep write logic in `src/features/*/mutations.ts`.
- Keep validation schemas in `src/features/*/validation.ts` or `src/lib/validations/*`.
- Every `page.tsx` needs a matching `loading.tsx` that mirrors the page layout.
- `/planning` is the canonical planning route. Do not add aliases like `/assessments` or `/calendar`.

## Results and Errors

- Server Actions must return typed results, never throw to the client.
- Use this result shape: `{ success: true, data } | { success: false, error: string }`.
- Validate inputs with Zod before DB access.
- Return validation error results on invalid input.
- Do not expose internal errors, stack traces, SQL errors, provider errors, or secrets to clients.

## Auth and Security

- Server auth uses `auth.api.getSession()` from `src/lib/auth/auth.ts`.
- Always check authentication and approved access status.
- Always filter user-owned data by `userId`.
- Admin mutations stay server-only.
- Secrets stay server-only, encrypted at rest when stored, and are never returned after save.
- Exports must exclude auth/session/account tables and secret fields.
- Never expose secrets in errors, logs, fixtures, tests, or messages.

## Database

- Define tables in `src/db/schema.ts` with Drizzle `pgTable` and `relations()`.
- Use `text` IDs.
- Include `createdAt` and `updatedAt` on every table.
- Use `onDelete: "cascade"` where appropriate.
- Preserve backward compatibility unless the user explicitly approves a breaking change.
- Keep migrations safe to run in production.
- Never manually edit `drizzle/*.sql` or `drizzle/meta/*`.
- For schema changes, tell the user to run `bun run db:generate` and `bun run db:migrate`.

## Validation

- Define Zod schemas for forms and Server Actions.
- Validate on both client and server.
- Use `@hookform/resolvers/zod` with React Hook Form.
- Export matching TypeScript types with `z.infer<>`.
- Do not duplicate validation schemas.

## React

- Treat React Compiler as enabled.
- Do not use `useCallback`, `useMemo`, or `memo` by default.
- Use manual memoization only when required for correctness and state the reason in the change summary.
- Avoid unnecessary client components.
- Avoid over-fetching. Select only required fields.
- Prefer server-side data composition over client aggregation.

## Components

- Keep components focused and single-purpose.
- Component file order: types, main component, helpers.
- Props type name: `[ComponentName]Props`.
- Use named exports except for Next.js pages and layouts.
- For async actions, disable the button, show a spinner, and use a pending label.
- Reuse `async-button-content.tsx` for async button content.
- Remove unreachable code immediately.
- Do not add speculative scaffolding.

## Styling

- Use Tailwind CSS 4.
- Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Never use hardcoded Tailwind color classes.
- All UI colors must use CSS variables so user themes work.

```tsx
className =
  "bg-(--status-danger-fill) text-(--assessment-exam-text) border-(--status-warning-border)";
```

- For SVGs, use `stroke="currentColor"` and a theme variable text class.
- Use semantic variables from `src/app/globals.css`: `--primary`, `--secondary`, `--accent`, `--destructive`, `--muted`, `--background`, `--foreground`, `--border`.
- Use status variables for assessment, danger, warning, success, and chart colors.

## Formatting

- Use Biome. Do not discuss formatting style beyond the formatter.
- Keep files kebab-case.
- Functions use camelCase.
- Components and types use PascalCase.
- True constants use UPPER_SNAKE_CASE.
- Config objects use camelCase.
- Use `@/` alias imports.

## Logging

- Use structured JSON when logging for debugging or observability.
- Use plain text only for user-facing CLI output.
- Include named fields that make failures filterable and correlatable.
- Do not log secrets, tokens, cookies, raw auth payloads, or private user content.

## Definition of Done

- Behavior matches `SPEC.md`.
- Inputs are validated with Zod.
- Auth and `userId` ownership are enforced.
- Server Actions return typed results.
- Revalidation is implemented where UI data changes.
- Tests cover new functions and regressions.
- New files and touched modules are reachable from active app code.
- No unused code remains unless explicitly called out with a reason.
