# Notorium — Agent Instructions

## Project Overview

Notorium is a study management app built with Next.js 16 (App Router). Core modules include subjects, notes, flashcards, assessments, and attendance. See `SPEC.md` for the full product specification, features, and acceptance criteria.
Notes and flashcards support rich text and render images from pasted direct image URLs, supported Imgur share links, and Markdown image syntax. Unsupported relative or local media references degrade to plain text instead of rendering as images.
Flashcards on subject detail are presented in a collapsed section and loaded when expanded.
Subject detail flashcards also support importing Anki `.txt` exports into the current subject while preserving supported scheduling metadata when present.
Flashcards also have a dedicated page under each subject, and global search routes flashcard results to that page.
Flashcard review uses a memory-state scheduler with stored review logs and per-user parameter tuning.
Flashcard review supports keyboard shortcuts on the review screen: `Enter` reveals the back or grades Good, and `1` to `4` map to Again, Hard, Good, and Easy after the answer is shown.
Profile data transfer is available to all users: full mode exports/imports flashcards and flashcard review settings, while template export excludes notes, attendance records, and flashcards.
Authentication is approval-based: new users start as pending, only approved users can access the app, and admins can approve/block users from an Admin Panel entry in the authenticated account menu.
Local infrastructure and app runtime can be started together with Docker Compose. Use `compose.yml` for the production-like stack (`app`, `postgres`, `redis`, and a one-off `migrate` service) and `compose.dev.yml` for development infrastructure only (`postgres` and `redis`, with the app running via local `bun dev`).

## Project Structure

```
src/
├── api/              # API route handlers (Better Auth)
├── app/              # Next.js App Router pages and layouts
│   ├── [locale]/     # Locale-prefixed app routes (en, pt)
│   ├── actions/      # Server Actions
│   ├── api/          # App Router API routes
│   └── globals.css   # Global styles (Tailwind)
├── components/       # Feature-first UI components
│   ├── ui/           # shadcn/ui primitives (do not edit manually)
│   ├── navbar/       # Global navigation, search, theme, preferences
│   ├── shared/       # Cross-feature shared components and editors
│   ├── auth/         # Login and signup forms
│   └── ...           # Feature folders (subjects, notes, flashcards, etc.)
├── features/         # Feature-scoped queries, mappers, business logic
├── db/               # Database layer
│   ├── index.ts      # Drizzle client instance
│   └── schema.ts     # Drizzle schema definitions
├── i18n/             # next-intl routing and request setup
├── messages/         # Locale dictionaries (en.json, pt.json)
├── lib/              # Cross-feature infrastructure
│   ├── auth/         # Better Auth config, client, access control, rate limiting
│   ├── server/       # Server action helpers, contracts, revalidation
│   ├── editor/       # Rich-text and editor helpers
│   ├── dates/        # Calendar/date helpers
│   ├── validations/  # Shared validation utilities and boundary schemas
│   └── utils.ts      # General utilities (cn helper)
└── env.ts            # Environment variable validation
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
- **Redis** (via Docker Compose)

## Coding Rules

### General

- **No comments in code.** Code should be self-explanatory through good naming.
- **No `console.log` in production code.** Remove all debug logs before committing.
- **Follow Biome rules.** Run `bun run lint` to verify. Biome config is in `biome.json`.
- **Use TypeScript strictly.** No `any` types. Define proper types and interfaces.

### Next.js Patterns

- Use **Server Components** by default. Only add `"use client"` when necessary (interactivity, hooks, browser APIs).
- Use **Server Actions** (in `src/app/actions/`) for data mutations (create, update, delete).
- Keep read/query helpers, feature validation schemas, and feature business rules in `src/features/*` instead of expanding route files or action files.
- Keep Server Actions thin: authenticate, validate, delegate to feature helpers, and revalidate.
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
- Never manually edit Drizzle migration artifacts in `drizzle/*.sql` or `drizzle/meta/*`.
- For schema changes, prepare code changes and instruct the user to run `bun run db:generate` and `bun run db:migrate` themselves.

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

- Server-side: use `auth.api.getSession()` from `src/lib/auth/auth.ts`.
- Client-side: use `authClient` from `src/lib/auth/auth-client.ts` only when Better Auth client APIs are required, and ensure its `baseURL` matches the current environment.
- Always check authentication before accessing user-specific data.
- All user-owned data must filter by `userId` from the session.
- App access must enforce approved status (`pending` and `blocked` users cannot access authenticated routes/actions).
- User access management mutations (approve/block/pending) must be admin-only on server side.

### Testing

- Use **Vitest** for unit and integration tests. Place test files next to the source file with a `.test.ts` suffix.
- **Test behavior and logic, not constants.** Never write tests that merely re-assert hardcoded values from a constant object. If a function just returns a constant, one assertion (e.g., `toEqual(MY_CONSTANT)`) is enough — do not check each property individually.
- **Focus on edge cases, branching logic, and error handling.** Tests should exercise code paths that could actually break: conditionals, validations, error states, transformations, and boundary conditions.
- **Ask yourself: "If I deleted this test, would I lose confidence in the code?"** If the answer is no, the test is not worth writing.
- Prefer fewer, meaningful tests over many shallow ones that inflate coverage without catching real bugs.

#### Unit / Integration Tests (Vitest)

This is where validation depth lives. Zod schemas and utility functions are tested exhaustively here.

- **Zod schema tests should verify rejection of invalid inputs**, not just confirm that valid data passes. Test missing fields, wrong types, boundary values, and malformed data. Cover all edge cases, all refinements, all error messages.
- **Do NOT test Server Actions.** Server actions should not be unit tested to avoid overly complex mocks. Prefer testing the extracted validation and business logic they depend on instead.
- **Utility / business logic tests** should cover branching, boundary conditions, and transformations (e.g., weighted vs simple averages, overdue detection, system limit logic).

### Styling

- Use **Tailwind CSS 4** for styling.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

## Agent Behavior

- **Use Bun, never npm.** When installing dependencies, running scripts, or interacting with the project, always use `bun`. Do not use `npm` or `npx`.
- **Ask before assuming.** If a requirement is unclear or ambiguous, ask the user for clarification before proceeding.
- **Follow SPEC.md for current behavior.** Use it as source of truth for implemented product rules.
- **Update docs in the right place.** Keep `SPEC.md` stable.
- **Keep docs synchronized with implementation.** When behavior changes, update `README.md`, `SPEC.md`, and `AGENTS.md` in the same PR.
- **Small, focused changes.** Implement one feature or fix at a time. Do not make unrelated changes.
- **Test after changes.** Verify the dev server still runs (`bun dev`) and check for lint errors (`bun run lint`) after making changes.
- **Follow existing commit message patterns.** Base each new commit message on previous commit messages and keep the same structure/style pattern.
