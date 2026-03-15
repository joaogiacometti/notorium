# Notorium — Agent Instructions

## Project Overview

Notorium is a study management app built with Next.js 16 (App Router). Core modules include subjects, notes, flashcards, assessments, and attendance.

For product behavior, UX rules, and acceptance criteria, use `SPEC.md`. This file is for repository workflow, engineering constraints, and contributor guidance only.

## Documentation Ownership

- `SPEC.md` owns product behavior, UX rules, feature constraints, and acceptance criteria.
- `README.md` owns setup, runtime, local development, commands, and environment guidance.
- `AGENTS.md` owns coding rules, architecture guidance, testing expectations, and contributor workflow.
- Do not duplicate detailed feature behavior across these files.
- When behavior changes, update `SPEC.md`.
- When setup, commands, environment, or deployment guidance changes, update `README.md`.
- When contributor workflow or engineering rules change, update `AGENTS.md`.
- If a change spans more than one ownership area, update each relevant document and keep the boundaries clear.

## Project Structure

```text
src/
├── api/              API route handlers (Better Auth)
├── app/              Next.js App Router pages and layouts
│   ├── [locale]/     Locale-prefixed app routes (en, pt)
│   ├── actions/      Server Actions
│   ├── api/          App Router API routes
│   └── globals.css   Global styles (Tailwind)
├── components/       Feature-first UI components
│   ├── ui/           shadcn/ui primitives (do not edit manually)
│   ├── navbar/       Global navigation, search, theme, preferences
│   ├── shared/       Cross-feature shared components and editors
│   ├── auth/         Login and signup forms
│   └── ...           Feature folders (subjects, notes, flashcards, etc.)
├── features/         Feature-scoped queries, mappers, business logic
├── db/               Database layer
│   ├── index.ts      Drizzle client instance
│   └── schema.ts     Drizzle schema definitions
├── i18n/             next-intl routing and request setup
├── messages/         Locale dictionaries (en.json, pt.json)
├── lib/              Cross-feature infrastructure
│   ├── auth/         Better Auth config, client, access control, rate limiting
│   ├── server/       Server action helpers, contracts, revalidation
│   ├── editor/       Rich-text and editor helpers
│   ├── dates/        Calendar/date helpers
│   ├── validations/  Shared validation utilities and boundary schemas
│   └── utils.ts      General utilities
└── env.ts            Environment variable validation
```

## Commands

| Command                                   | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `bun dev`                                 | Start development server               |
| `bun run build`                           | Production build                       |
| `bun run typecheck`                       | TypeScript type checking               |
| `bun run lint`                            | Run Biome linter                       |
| `bun run format`                          | Format code with Biome                 |
| `bun run test`                            | Run Vitest test suite                  |
| `bun run test:watch`                      | Run Vitest in watch mode               |
| `bun run test:coverage`                   | Run Vitest with coverage               |
| `bun run db:generate`                     | Generate Drizzle migrations            |
| `bun run db:migrate`                      | Run Drizzle migrations                 |
| `bun run db:push`                         | Push schema directly to DB             |
| `docker compose up --build -d`            | Start production-like local stack      |
| `docker compose -f compose.dev.yml up -d` | Start development infrastructure stack |

## Tech Stack

- Next.js
- React
- TypeScript
- Drizzle ORM
- Better Auth
- Zod
- React Hook Form
- shadcn/ui
- Biome
- Bun
- PostgreSQL
- Redis

## Coding Rules

### General

- No comments in code.
- No `console.log` in production code.
- Follow Biome rules. Run `bun run lint` to verify.
- Use TypeScript strictly. Do not use `any`.

### Next.js Patterns

- Use Server Components by default. Add `"use client"` only when required.
- Use Server Actions in `src/app/actions/` as the only client-callable server boundary for both reads and writes.
- Keep read/query helpers, feature validation schemas, and business rules in `src/features/*`.
- Use `src/features/*/queries.ts` as the default home for read-side DB access.
- Use `src/features/*/mutations.ts` as the default home for write-side DB access and feature-owned business rules.
- Server Components should read from `src/features/*` directly instead of calling `src/app/actions/*`.
- Keep Server Actions thin: authenticate, validate, delegate, revalidate, and return typed results.
- `src/app/actions/*` should not import `@/db/index` directly unless a documented exception is required.
- Client Components should call server code only through `src/app/actions/*`.
- Use `@/` alias imports.
- Every route with a `page.tsx` must have a matching `loading.tsx` that mirrors the page layout structure. When a page layout changes (e.g., wrapper classes, sections, structural hierarchy), update the corresponding `loading.tsx` skeleton to match.
- Treat `/planning` as the canonical route for planning views. Do not add route aliases like `/assessments` or `/calendar`.

### React Compiler

- Treat React Compiler as enabled for this project.
- Do not use `useCallback`, `useMemo`, or `memo` by default.
- Use manual memoization only when required for correctness.
- If manual memoization is necessary, state the reason in the change summary.

### Database

- Define tables in `src/db/schema.ts` with Drizzle `pgTable`.
- Define relations with Drizzle `relations()`.
- Use `text` type for IDs.
- Include `createdAt` and `updatedAt` timestamps on every table.
- Use `onDelete: "cascade"` where appropriate.
- Never manually edit `drizzle/*.sql` or `drizzle/meta/*`.
- For schema changes, prepare code changes and instruct the user to run `bun run db:generate` and `bun run db:migrate`.

### Validation

- Define Zod schemas for all form inputs and server action parameters.
- Use `@hookform/resolvers/zod` with React Hook Form.
- Validate on both client and server sides.

### Localization

- Supported locales are `en` and `pt`.
- Any user-facing text change must be applied to both `src/messages/en.json` and `src/messages/pt.json`.
- Keep translation key structures aligned between locale files.
- Any new page or route must work under locale-prefixed routing in `src/app/[locale]/`.
- Keep localization requirements explicit in documentation, but keep feature behavior details in `SPEC.md`.

### Components

- Use shadcn/ui components from `src/components/ui/`. Do not modify those files directly.
- When a matching shadcn/ui primitive already exists, use it instead of building a custom replacement.
- When the project has the underlying shadcn-compatible dependency available but the primitive is missing from `src/components/ui/`, add the standard shadcn primitive first, then use it.
- Put custom components in `src/components/`.
- Keep components focused and single-purpose.
- Do not keep speculative scaffolding, placeholder modules, or "might use later" components in the repo.
- When a new implementation replaces an old path, remove the old unreachable code in the same change unless the user explicitly asks to keep it.
- Before finishing, verify that new files and touched modules are reachable from active app code using search or project checks.
- If intentionally unused code must remain, call it out explicitly in the change summary with the reason it still exists.

### Authentication

- Server-side: use `auth.api.getSession()` from `src/lib/auth/auth.ts`.
- Client-side: use `authClient` from `src/lib/auth/auth-client.ts` only when Better Auth client APIs are required.
- Always check authentication before accessing user-specific data.
- All user-owned data must filter by `userId` from the session.
- App access must enforce approved status.
- User access management mutations must be admin-only on the server side.

### Sensitive Data

- Never export, import, log, cache in client state, or expose sensitive information unless it is strictly required for the feature and explicitly approved by product behavior in `SPEC.md`.
- Sensitive information includes API keys, auth/session/account/verification data, tokens, password hashes, provider credentials, encrypted secret material, and account/profile metadata that is not required by the current feature.
- Data transfer must stay study-data-only. Exports and imports must exclude AI settings, auth/session tables, account security data, and any future secret-bearing fields by default.
- Secrets must remain server-only, encrypted at rest when persisted, and must never be returned to the client after save.
- Do not include sensitive values in action errors, telemetry payloads, test fixtures, snapshots, or user-facing messages.

### Testing

- Use Vitest for unit and integration tests. Place test files next to the source file with a `.test.ts` suffix.
- Test behavior and logic, not constants.
- Focus on edge cases, branching logic, transformations, and error handling.
- Prefer fewer meaningful tests over shallow coverage inflation.
- Do not test Server Actions directly.
- Do not add direct tests for `queries.ts`, `mutations.ts`, or `revalidation.ts`.
- Keep Server Actions thin and keep write-side feature logic in `mutations.ts`.
- Zod schema tests should reject invalid inputs thoroughly.
- Add or update regression tests when changing auth, AI, account, or data-transfer code so sensitive fields cannot leak into exports, imports, logs, or client-visible payloads.

### E2E Testing

- Focus E2E tests on essential user flows and critical paths only.
- Test core functionality: create, read, update, delete operations for each feature.
- Assert user-meaningful outcomes (behavior, permissions, persistence, and error handling), not implementation details.
- Avoid testing UI variations, styling, spacing, colors, typography, or non-critical interactions.
- Avoid assertions on exact URLs, exact copy, CSS classes, or DOM structure unless they are explicit product requirements in `SPEC.md`.
- For each assertion, use this filter: if it fails, a meaningful user outcome must be broken.
- Prefer asserting post-action state over route shape (for example, assert destination content or disabled/enabled actions after redirects).
- If asserting navigation is necessary, assert intent-level behavior rather than tightly coupled URL formatting whenever possible.
- Treat limit-warning message copy as secondary; primary assertions should confirm the limit is enforced (for example, creation actions are blocked).
- Prioritize user journeys that impact data integrity and core business logic.
- Keep E2E tests parallel-safe with unique test data and proper cleanup.
- Split combined CRUD operations into separate tests (e.g., edit and delete should be different tests).
- Prefer resilient, accessibility-oriented selectors (`getByRole`, labels, test ids) over brittle structural selectors.

### Styling

- Use Tailwind CSS 4 for styling.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

## Agent Behavior

- Use Bun, never npm.
- Ask before assuming when a requirement is genuinely unclear.
- Follow `SPEC.md` as the source of truth for product behavior.
- Do not copy detailed feature behavior from `SPEC.md` into `README.md` or `AGENTS.md`.
- Keep changes small and focused.
- Test after changes. Verify the dev server still runs with `bun dev` and run `bun run lint --fix` when the environment supports it.
- Follow existing commit message patterns.
