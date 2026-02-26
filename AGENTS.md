# Notorium — Agent Instructions

## Project Overview

Notorium is a study management app built with Next.js 16 (App Router). See `SPEC.md` for the full product specification, features, and acceptance criteria.

## Product Docs Workflow

- `SPEC.md`: current behavior and product constraints only.
- `ROADMAP.md`: planned and in-progress future features.
- When implementing a future feature, update its status in `ROADMAP.md`.

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

### Styling

- Use **Tailwind CSS 4** for styling.
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

## Agent Behavior

- **Ask before assuming.** If a requirement is unclear or ambiguous, ask the user for clarification before proceeding.
- **Follow SPEC.md for current behavior.** Use it as source of truth for implemented product rules.
- **Follow ROADMAP.md for future work.** Use it to determine what should be built next.
- **Update docs in the right place.** Keep `SPEC.md` stable and move planning/status updates to `ROADMAP.md`.
- **Small, focused changes.** Implement one feature or fix at a time. Do not make unrelated changes.
- **Test after changes.** Verify the dev server still runs (`bun dev`) and check for lint errors (`bun run lint`) after making changes.
