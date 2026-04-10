# Notorium — Agent Instructions

## Documentation Ownership

| File | Owns |
|------|------|
| `SPEC.md` | Product behavior, UX rules, feature constraints, acceptance criteria |
| `README.md` | Setup, runtime, local development, commands, environment |
| `AGENTS.md` | Coding rules, architecture guidance, testing expectations, contributor workflow |

When behavior changes → update `SPEC.md`. When setup/commands change → update `README.md`. When engineering rules change → update `AGENTS.md`. Never duplicate detailed feature behavior across files.

## Project Structure

```text
src/
├── api/              API route handlers (Better Auth)
├── app/              Next.js App Router pages and layouts
│   ├── (app)/        Authenticated route group
│   ├── actions/      Server Actions
│   ├── api/          App Router API routes
│   ├── login/        Login page
│   ├── signup/       Signup page
│   ├── globals.css   Global styles (Tailwind)
│   ├── layout.tsx    Root layout
│   ├── page.tsx      Landing page
│   └── not-found.tsx 404 page
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
├── lib/              Cross-feature infrastructure
│   ├── auth/         Better Auth config, client, access control
│   ├── server/       Server action helpers, contracts, revalidation
│   ├── editor/       Rich-text and editor helpers
│   ├── dates/        Calendar/date helpers
│   ├── validations/  Shared validation utilities and boundary schemas
│   ├── rate-limit/   Rate limiting utilities
│   ├── ai/           AI integration helpers
│   ├── theme.ts      Theme management
│   └── utils.ts      General utilities
└── env.ts            Environment variable validation
```

## Tech Stack

Next.js · React · TypeScript · Drizzle ORM · Better Auth · Zod · React Hook Form · shadcn/ui · Biome · Bun · PostgreSQL · Redis

## Coding Rules

### General

- No comments. No `console.log` in production.
- TypeScript strict mode. No `any`.
- Use Bun, never npm.

### Next.js Patterns

- Use Server Components by default. Add `"use client"` only when required.
- Server Actions in `src/app/actions/` are the only client-callable server boundary (reads and writes).
- Keep queries in `src/features/*/queries.ts`, write-side logic in `src/features/*/mutations.ts`.
- Server Components read from `src/features/*` directly — never through `src/app/actions/*`.
- Keep Server Actions thin: authenticate → validate → delegate → revalidate → return typed result.
- `src/app/actions/*` must not import `@/db/index` directly unless explicitly documented.
- Client Components call server code only through `src/app/actions/*`.
- Use `@/` alias imports.
- Every `page.tsx` must have a matching `loading.tsx` that mirrors the page layout structure. Keep them in sync when layout changes.
- `/planning` is the canonical route for planning views. Do not add aliases like `/assessments` or `/calendar`.

### Error Handling

- Server Actions must return typed results — never throw to the client.
- Use a consistent result shape: `{ success: true, data } | { success: false, error: string }`.
- Validate inputs with Zod before any DB access; return a validation error result on failure.
- Do not expose internal error messages, stack traces, or DB errors in the returned error string.

### React Compiler

- Treat React Compiler as enabled. Do not use `useCallback`, `useMemo`, or `memo` by default.
- Use manual memoization only when required for correctness; state the reason in the change summary.

### Performance

- Avoid unnecessary client components.
- Avoid over-fetching (select only required fields).
- Prefer server-side data composition over client aggregation.

### Database

- Define tables in `src/db/schema.ts` with Drizzle `pgTable` and `relations()`.
- Use `text` type for IDs. Include `createdAt` and `updatedAt` on every table.
- Use `onDelete: "cascade"` where appropriate.
- Never manually edit `drizzle/*.sql` or `drizzle/meta/*`.
- For schema changes, instruct user to run `bun run db:generate` and `bun run db:migrate`.

### Schema & Feature Changes

- Backward compatibility must be preserved unless explicitly approved.
- Migrations must be safe to run in production.

### Validation

- Define Zod schemas for forms and Server Actions. Use `@hookform/resolvers/zod` with React Hook Form.
- Validate on both client and server.

### Anti-patterns

- ❌ Calling DB from components
- ❌ Business logic inside Server Actions
- ❌ Duplicating validation schemas

### Components

- Use shadcn/ui primitives from `src/components/ui/`. Do not modify. Add missing primitives before use.
- Keep components focused and single-purpose.
- For async actions: disable button, show spinner, use pending label. Reuse `async-button-content.tsx`.
- Remove unreachable code immediately. No speculative scaffolding.

### Authentication

- Server: `auth.api.getSession()` from `src/lib/auth/auth.ts`.
- Client: `authClient` from `src/lib/auth/auth-client.ts` (only when needed).
- Always check auth and filter by `userId`. Enforce approved status. Admin mutations server-only.

### Sensitive Data

- Secrets stay server-only, encrypted at rest, never returned after save.
- Exports exclude auth/session/account tables and secret fields.
- Never expose secrets in errors, logs, fixtures, or messages.

## Styling

Use Tailwind CSS 4. Use `cn()` from `src/lib/utils.ts` for conditional class merging.

### Color Theming — BUSINESS CRITICAL

**Never use hardcoded Tailwind color classes.** All UI colors must use CSS variables so they respect the user's chosen theme.

```tsx
// ❌ Wrong
className="bg-red-500 text-yellow-600 border-orange-500/60"

// ✅ Correct
className="bg-[var(--status-danger-fill)] text-[var(--assessment-exam-text)] border-[var(--status-warning-border)]"
```

**Available theme variables** (defined in `src/app/globals.css`):

| Group | Variables |
|-------|-----------|
| Assessment | `--assessment-exam-border`, `--assessment-exam-bg`, `--assessment-exam-text` |
| Danger/Again | `--status-danger-border`, `--status-danger-bg`, `--status-danger-text`, `--status-danger-fill` |
| Warning/Hard | `--status-warning-border`, `--status-warning-bg`, `--status-warning-text`, `--status-warning-fill` |
| Success/Easy | `--status-success-border`, `--status-success-bg`, `--status-success-text`, `--status-success-fill` |
| Charts | `--chart-1` through `--chart-5` |
| Semantic | `--primary`, `--secondary`, `--accent`, `--destructive`, `--muted`, `--background`, `--foreground`, `--border` |

Usage: `bg-[var(--x)]`, `text-[var(--x)]`, `border-[var(--x)]`, `bg-[var(--x)]/90`. For SVG: `stroke="currentColor"` with `className="text-[var(--x)]"`.

## Testing

### Unit & Integration (Vitest)

- Test files next to source with `.test.ts` suffix.
- Test behavior and edge cases, not constants or implementation.
- Don't test Server Actions, queries, mutations directly.
- Zod tests must reject invalid inputs.
- Add regression tests for auth/AI/account/data-transfer changes.

### TDD Cycle

1. **Red** — Write failing test.
2. **Green** — Minimal code to pass.
3. **Refactor** — Improve while keeping tests green.

### E2E (Playwright)

- Cover essential CRUD flows per feature.
- Assert outcomes: behavior, permissions, persistence, errors.
- Use resilient selectors (`getByRole`, labels, test ids).
- Parallel-safe with unique data and cleanup.

### Definition of Done

- Validated inputs (Zod)
- Auth enforced
- Revalidation implemented
- No unused code
- Tests added (if applicable)

## File & Naming Conventions

- **Files**: kebab-case for all files (`user-settings.ts`, `async-button.tsx`)
- **Functions**: camelCase (`getUserById`, `calculateAverage`)
- **Components**: PascalCase (`UserProfile`, `AsyncButton`)
- **Types/Interfaces**: PascalCase, co-located with usage or in feature-level `types.ts`
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config objects

## Feature Module Structure

Standard feature folder anatomy:

```
features/[feature-name]/
  queries.ts       - read operations (called from Server Components)
  mutations.ts     - write operations (called by Server Actions)
  validation.ts    - feature-specific Zod schemas
  mappers.ts       - data transformation (optional)
  types.ts         - feature-specific types (optional)
  utils.ts         - feature-specific helpers (optional)
  constants.ts     - feature-specific constants (optional)
```

**Queries:**
- Called directly from Server Components
- Return domain objects, not raw DB rows
- Use Drizzle queries with proper joins and filtering
- Always filter by `userId` for user-owned data

**Mutations:**
- Called by Server Actions in `src/app/actions/`
- Contain write-side business logic
- Return success/error objects, never throw
- Handle transactions when needed

**Validation:**
- Export Zod schemas for Server Action inputs
- Schemas used with React Hook Form via `@hookform/resolvers/zod`
- Must have matching TypeScript types via `z.infer<>`

## Component Organization

- **Structure:** Types → Main component → Helpers
- **Props:** `[ComponentName]Props` pattern, export for reuse
- **Exports:** Named exports (except Next.js pages/layouts)
- **Size:** Split at >150 lines or when logic is reusable. Extract to same file first, separate only when shared.

## Agent Behavior

### Focus Areas

AI agents should focus on:
- **Coding** — Writing, modifying, and refactoring code
- **Architecture** — Designing feature structure, choosing patterns, organizing modules **with the user**
- **Documentation** — Updating `AGENTS.md`, `SPEC.md`, `README.md` when patterns change
- **Suggestions** — Proposing improvements, identifying issues, recommending approaches

### What NOT to Do

**Do NOT run verification commands** — User handles these manually for token efficiency:
- ❌ Do not run `bun run lint` or `bun run lint --fix`
- ❌ Do not run `bun run test` (except for TDD, see below)
- ❌ Do not run `bun run typecheck`
- ❌ Do not run `bun run build`
- ❌ Do not run `bun dev` to verify server starts

**Exception:** When explicitly doing TDD, run specific test files (`bun run test [file]`) to verify the red-green-refactor cycle.

### General Guidelines

- Ask before assuming when a requirement is genuinely unclear.
- Follow `SPEC.md` as the source of truth for product behavior.
- Keep changes small and focused.
- Follow existing commit message patterns.
- Before finishing, verify new files and touched modules are reachable from active app code.
- Call out intentionally unused code explicitly in the change summary with the reason it still exists.