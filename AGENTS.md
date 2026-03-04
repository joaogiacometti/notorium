# Notorium — Agent Instructions

## Project Overview

Notorium is a study management app built with Next.js 16 (App Router). Core modules include subjects, notes, flashcards, assessments, and attendance. See `SPEC.md` for the full product specification, features, and acceptance criteria.

## Project Structure

```
src/
├── api/              # API route handlers (Better Auth)
├── app/              # Next.js App Router pages and layouts
│   ├── [locale]/     # Locale-prefixed app routes (en, pt)
│   ├── actions/      # Server Actions
│   ├── api/          # App Router API routes
│   └── globals.css   # Global styles (Tailwind)
├── components/       # React components
│   ├── ui/           # shadcn/ui primitives (do not edit manually)
│   ├── navbar/       # Navigation bar, global search, theme
│   ├── login-form.tsx
│   └── signup-form.tsx
├── db/               # Database layer
│   ├── index.ts      # Drizzle client instance
│   └── schema.ts     # Drizzle schema definitions
├── i18n/             # next-intl routing and request setup
├── messages/         # Locale dictionaries (en.json, pt.json)
├── lib/              # Shared utilities
│   ├── auth.ts       # Better Auth server config
│   ├── auth-client.ts # Better Auth client
│   └── utils.ts      # General utilities (cn helper)
└── env.ts            # Environment variable validation
```

## Commands

| Command               | Description                 |
| --------------------- | --------------------------- |
| `bun dev`             | Start development server    |
| `bun run build`       | Production build            |
| `bun run typecheck`   | TypeScript type checking    |
| `bun run lint`        | Run Biome linter            |
| `bun run format`      | Format code with Biome      |
| `bun run test`        | Run Vitest test suite       |
| `bun run test:watch`  | Run Vitest in watch mode    |
| `bun run test:coverage` | Run Vitest with coverage  |
| `bun run cypress:open` | Open Cypress UI            |
| `bun run cypress:run` | Run Cypress headless        |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate`  | Run Drizzle migrations      |
| `bun run db:push`     | Push schema directly to DB  |

## Tech Stack

- **Next.js** (App Router, React Server Components)
- **React**
- **TypeScript**
- **Drizzle ORM**
- **Better Auth**
- **Zod**
- **React Hook Form**
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **Biome** (linter + formatter)
- **Bun** (package manager and runtime)
- **PostgreSQL** (via Docker Compose)

## Coding Rules

### General

- **No comments in code.** Code should be self-explanatory through good naming.
- **No `console.log` in production code.** Remove all debug logs before committing.
- **Follow Biome rules.** Run `bun run lint` to verify. Biome config is in `biome.json`.
- **Use TypeScript strictly.** No `any` types. Define proper types and interfaces.

### Next.js Patterns

- Use **Server Components** by default. Only add `"use client"` when necessary (interactivity, hooks, browser APIs).
- Use **Server Actions** (in `src/app/actions/`) for data mutations (create, update, delete).
- Use `@/` alias for imports (configured in `tsconfig.json`).

### React Compiler

- Treat **React Compiler** as enabled for this project.
- Do not use `useCallback`, `useMemo`, or `memo` by default.
- Use manual memoization only when required for correctness, not performance micro-optimizations.
- If manual memoization is truly needed, keep it minimal and state the reason in the change summary.

### Database

- Define all tables in `src/db/schema.ts` using Drizzle's `pgTable`.
- Define relations using Drizzle's `relations()` helper.
- Use `text` type for IDs (not `uuid` or `serial`).
- Always include `createdAt` and `updatedAt` timestamps on every table.
- Use `onDelete: "cascade"` for foreign keys where appropriate.
- Run `bun run db:generate` after schema changes, then `bun run db:migrate`.

### Validation

- Define Zod schemas for all form inputs and server action parameters.
- Use `@hookform/resolvers/zod` to connect Zod schemas with React Hook Form.
- Validate on both client (form) and server (action) sides.

### Localization (Required)

- Supported locales are `en` and `pt`.
- Any user-facing text change must be applied to both `src/messages/en.json` and `src/messages/pt.json`.
- Keep translation key structures aligned between locale files; do not add a key to only one locale.
- Any new page/route must work under locale-prefixed routing in `src/app/[locale]/`.
- If a change affects product copy or UX behavior, update docs (`README.md`, `SPEC.md`, `AGENTS.md`) so localization expectations stay explicit.

### Components

- Use **shadcn/ui** components from `src/components/ui/`. Do not modify these files directly. Use the `shadcn` CLI to add new ones.
- Custom components go in `src/components/`.
- Keep components focused and single-purpose.

### Authentication

- Server-side: use `auth.api.getSession()` from `src/lib/auth.ts`.
- Client-side: use `authClient` from `src/lib/auth-client.ts` only when Better Auth client APIs are required, and ensure its `baseURL` matches the current environment.
- Always check authentication before accessing user-specific data.
- All user-owned data must filter by `userId` from the session.

### Testing

- Use **Vitest** for unit and integration tests. Place test files next to the source file with a `.test.ts` suffix.
- Use **Cypress** for E2E tests. Place test files in `cypress/e2e/` with a `.cy.ts` suffix. Split test files by page or concern, not in a single monolith.
- **Test behavior and logic, not constants.** Never write tests that merely re-assert hardcoded values from a constant object. If a function just returns a constant, one assertion (e.g., `toEqual(MY_CONSTANT)`) is enough — do not check each property individually.
- **Focus on edge cases, branching logic, and error handling.** Tests should exercise code paths that could actually break: conditionals, validations, error states, transformations, and boundary conditions.
- **Ask yourself: "If I deleted this test, would I lose confidence in the code?"** If the answer is no, the test is not worth writing.
- Prefer fewer, meaningful tests over many shallow ones that inflate coverage without catching real bugs.

#### Unit / Integration Tests (Vitest)

This is where validation depth lives. Zod schemas, utility functions, and server action logic are tested exhaustively here.

- **Zod schema tests should verify rejection of invalid inputs**, not just confirm that valid data passes. Test missing fields, wrong types, boundary values, and malformed data. Cover all edge cases, all refinements, all error messages.
- **Server Action tests should cover authentication checks, authorization, and error responses**, not just the happy path.
- **Utility / business logic tests** should cover branching, boundary conditions, and transformations (e.g., weighted vs simple averages, overdue detection, plan limit logic).

#### E2E Tests (Cypress)

E2E tests prove the full stack works together: UI → form → action/API → database → response → rendered feedback. They are not for exhaustive field-level validation — Zod unit tests already cover that.

**Per-form E2E budget (target):**

| Test type                 | Count per form | Purpose                                                                         |
| ------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Happy path                | 1              | Create/submit succeeds, data appears, correct redirect                          |
| Representative validation | 1              | One invalid case → error surfaces in UI, no redirect/side-effect                |
| Server error              | 0–1            | Server-rejected action shows toast (e.g., duplicate email, invalid credentials) |
| Auth / permissions        | 0–1            | Unauth redirect or plan-gated feature blocked                                   |

This means ~2–4 Cypress tests per form, not 6–8.

**What TO test in E2E:**

- **Critical user flows.** End-to-end journeys that cross multiple pages (signup → redirect → logout → login).
- **CRUD operations.** One happy-path test per entity (create, edit, delete) to prove the full stack wiring.
- **One representative validation per form.** Pick the most important invalid case (e.g., empty required field) that proves UI → action → error rendering works. Do not test every field's required message, every Zod refinement, or every boundary.
- **Server-rejected errors.** Assert that error toasts appear for actions the server rejects (invalid credentials, duplicate email, duplicate attendance date). These are not caught by client-side Zod.
- **Auth guards.** Test that protected routes redirect unauthenticated users to `/login` and that authenticated users are redirected away from `/login` and `/signup`.
- **Plan/business rule enforcement.** Test that plan limits and feature gates work in the UI (e.g., free plan blocks image uploads, subject limit disables create button).

**What NOT to test in E2E:**

- **Exhaustive field validation.** Do not E2E-test every field's required message, min/max length, format error, or refinement combination. One representative case per form is enough. Move the rest to Zod unit tests.
- **Exact error message wording.** Unless it is a compliance/product requirement, do not assert specific error strings beyond the one representative case.
- **Multiple variations of the same invalid pattern.** Do not test short password _and_ long password _and_ empty password in E2E. Pick one; Zod tests cover the rest.
- **Browser-native behavior.** Do not test things the browser enforces (e.g., `type="email"` validation via `:invalid` pseudo-class).
- **Static content strings.** Do not assert heading text just to confirm a page rendered. Prefer asserting interactive elements that prove the page is functional.
- **`<Link>` navigation.** If the `href` attribute is already asserted, do not add a separate click-and-check-url test — that tests Next.js routing, not our code.
- **Duplicate auth guard tests.** If a route's auth redirect is tested in `auth.cy.ts`, do not re-test it in that feature's spec file.

### Styling

- Use **Tailwind CSS 4** for styling.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

## Agent Behavior

- **Ask before assuming.** If a requirement is unclear or ambiguous, ask the user for clarification before proceeding.
- **Follow SPEC.md for current behavior.** Use it as source of truth for implemented product rules.
- **Update docs in the right place.** Keep `SPEC.md` stable.
- **Keep docs synchronized with implementation.** When behavior changes, update `README.md`, `SPEC.md`, and `AGENTS.md` in the same PR.
- **Small, focused changes.** Implement one feature or fix at a time. Do not make unrelated changes.
- **Test after changes.** Verify the dev server still runs (`bun dev`) and check for lint errors (`bun run lint`) after making changes.
- **Follow existing commit message patterns.** Base each new commit message on previous commit messages and keep the same structure/style pattern.
