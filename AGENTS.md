# Notorium — Agent Instructions

## Project Overview

Notorium is a study management app built with Next.js 16 (App Router). See `SPEC.md` for the full product specification, features, and acceptance criteria.

## Project Structure

```
src/
├── api/              # API route handlers (Better Auth)
├── app/              # Next.js App Router pages and layouts
│   ├── actions/      # Server Actions
│   ├── login/        # Login page
│   ├── signup/       # Signup page
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles (Tailwind)
├── components/       # React components
│   ├── ui/           # shadcn/ui primitives (do not edit manually)
│   ├── navbar/       # Navigation bar, global search, theme
│   ├── login-form.tsx
│   └── signup-form.tsx
├── db/               # Database layer
│   ├── index.ts      # Drizzle client instance
│   └── schema.ts     # Drizzle schema definitions
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
| `bun run lint`        | Run Biome linter            |
| `bun run format`      | Format code with Biome      |
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
- **Zod schema tests should verify rejection of invalid inputs**, not just confirm that valid data passes. Test missing fields, wrong types, boundary values, and malformed data.
- **Server Action tests should cover authentication checks, authorization, and error responses**, not just the happy path.
- **Ask yourself: "If I deleted this test, would I lose confidence in the code?"** If the answer is no, the test is not worth writing.
- Prefer fewer, meaningful tests over many shallow ones that inflate coverage without catching real bugs.

#### What NOT to test in E2E

- **Browser-native behavior.** Do not test things the browser enforces (e.g., `type="email"` validation via `:invalid` pseudo-class). We did not write that code.
- **Static content strings.** Do not assert heading text just to confirm a page rendered. Prefer asserting interactive elements (links, buttons, forms) that prove the page is functional.
- **`<Link>` navigation.** If the `href` attribute is already asserted, do not add a separate click-and-check-url test — that tests Next.js routing, not our code.

#### What TO test in E2E

- **Form validation boundaries.** Test both min and max length limits from Zod schemas (short input, over-max input).
- **Error feedback.** Assert that error toasts appear for server-rejected actions (invalid credentials, duplicate email, etc.).
- **Loading/disabled states.** Verify submit buttons show loading text and are disabled during submission.
- **Auth guards.** Test that protected routes (`/subjects`, `/profile`, `/assessments`) redirect unauthenticated users to `/login`.
- **Auth redirects.** Test that authenticated users are redirected away from `/login` and `/signup`.
- **Full user flows.** Cover end-to-end journeys (signup → redirect → logout → login).

### Styling

- Use **Tailwind CSS 4** for styling.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

## Agent Behavior

- **Ask before assuming.** If a requirement is unclear or ambiguous, ask the user for clarification before proceeding.
- **Follow SPEC.md for current behavior.** Use it as source of truth for implemented product rules.
- **Update docs in the right place.** Keep `SPEC.md` stable.
- **Small, focused changes.** Implement one feature or fix at a time. Do not make unrelated changes.
- **Test after changes.** Verify the dev server still runs (`bun dev`) and check for lint errors (`bun run lint`) after making changes.
- **Follow existing commit message patterns.** Base each new commit message on previous commit messages and keep the same structure/style pattern.
