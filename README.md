# Notorium

Notorium is a study management app for students. It centralizes subjects, notes, flashcards, attendance, assessments, and personal search in one place with private, user-scoped data.

This document covers project setup, local development, and repository operations. For product behavior, UX rules, and feature acceptance criteria, use `SPEC.md`.

## High-Level Features

- Subject organization
- Rich text notes and flashcards
- Flashcard review with spaced repetition
- Attendance tracking
- Assessment tracking
- English (`en`) and Portuguese (`pt`) localization

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- React 19 + TypeScript 5
- PostgreSQL + Drizzle ORM
- Better Auth
- Zod + React Hook Form
- Tailwind CSS 4 + shadcn/ui
- Biome
- Bun

## Requirements

- Bun
- Docker (for local Docker Compose stack)

## Quick Start (Production-like Docker Compose)

1. Install dependencies:

```bash
bun install
```

2. Create environment file:

```bash
cp .env.example .env
```

Generate a secure auth secret before first run:

```bash
openssl rand -hex 32
```

3. Start the production-like stack:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.

The Compose stack runs:

- `postgres` (`postgres:17-alpine`)
- `redis` (`redis:7-alpine`)
- `migrate` (runs `bun run db:migrate` once on startup)
- `app` (containerized Next.js standalone server on port `3000`)

Security defaults in Compose:

- `app` runs as non-root with dropped Linux capabilities and `no-new-privileges`
- `postgres` and `redis` ports are bound to `127.0.0.1` only

## Quick Start (Development Infrastructure)

1. Install dependencies:

```bash
bun install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL and Redis:

```bash
docker compose -f compose.dev.yml up -d
```

The development Compose stack runs infrastructure only:

- `postgres` (`postgres:17-alpine`)
- `redis` (`redis:7-alpine`)

## Quick Start (Local Bun Dev Server)

1. Install dependencies:

```bash
bun install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Start infrastructure services:

```bash
docker compose -f compose.dev.yml up -d
```

4. Run database migrations:

```bash
bun run db:migrate
```

5. Start the development server:

```bash
bun dev
```

Open `http://localhost:3000`.

## Environment Variables

Defined in `src/env.ts`:

| Variable                         | Required    | Description                                                                               |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | Yes         | PostgreSQL connection string. This is the only variable required for `bun run db:migrate` |
| `BETTER_AUTH_URL`                | Yes         | Base app URL (local: `http://localhost:3000`)                                             |
| `BETTER_AUTH_SECRET`             | Yes         | Secret used by Better Auth (min 32 chars)                                                 |
| `RATE_LIMIT_BACKEND`             | No          | Rate-limit backend (`redis` default, or `upstash`)                                        |
| `UPSTASH_REDIS_REST_URL`         | Conditional | Required when `RATE_LIMIT_BACKEND=upstash`                                                |
| `UPSTASH_REDIS_REST_TOKEN`       | Conditional | Required when `RATE_LIMIT_BACKEND=upstash`                                                |
| `REDIS_URL`                      | Conditional | Required when `RATE_LIMIT_BACKEND=redis`                                                  |

## Scripts

| Command                     | Description                          |
| --------------------------- | ------------------------------------ |
| `bun dev`                   | Start development server             |
| `bun run build`             | Production build                     |
| `bun run start`             | Start production server              |
| `bun run typecheck`         | Run TypeScript checks                |
| `bun run lint`              | Run Biome checks                     |
| `bun run format`            | Format files with Biome              |
| `bun run test`              | Run Vitest suite                     |
| `bun run test:watch`        | Run Vitest in watch mode             |
| `bun run test:coverage`     | Run Vitest with coverage             |
| `bun run db:generate`       | Generate Drizzle migrations          |
| `bun run db:migrate`        | Apply Drizzle migrations             |
| `bun run db:push`           | Push schema directly to DB           |

## Project Structure

```text
src/
  api/               API route handlers
  app/               Next.js App Router pages and layouts
  app/[locale]/      Localized routes (en, pt)
  app/actions/       Server Actions
  components/        Feature-first UI components
  components/ui/     shadcn/ui primitives
  components/shared/ Shared cross-feature UI
  components/navbar/ Global navigation and preferences
  features/          Feature-scoped queries, mappers, and business logic
  db/                Drizzle client and schema
  i18n/              next-intl routing and request config
  messages/          Translation dictionaries (en.json, pt.json)
  lib/               Cross-feature infrastructure and shared utilities
  env.ts             Environment validation
```

## Database Workflow

When changing the schema:

1. Edit `src/db/schema.ts`
2. Do not manually edit files in `drizzle/*.sql` or `drizzle/meta/*`
3. Run `bun run db:generate`
4. Run `bun run db:migrate`

## Quality Checks

Run before pushing changes:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```
