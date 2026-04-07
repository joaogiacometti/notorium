# Notorium

Notorium is a study management app for students. It centralizes subjects, notes, flashcards, attendance, assessments, and personal search in one place with private, user-scoped data.

**AI Integration**: This project uses a Bring Your Own Key (BYOK) model for AI features. Users provide their own OpenRouter API key to access AI-powered flashcard generation.

This document covers project setup, local development, and repository operations. For product behavior, UX rules, and feature acceptance criteria, use `SPEC.md`.

## High-Level Features

- Subject organization
- Rich text notes and flashcards
- Deck organization for flashcards
- Flashcard review with spaced repetition
- Attendance tracking
- Assessment tracking
- English-only interface

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- React 19 + TypeScript 5
- PostgreSQL + Drizzle ORM
- Better Auth
- Zod + React Hook Form
- Vercel AI SDK + OpenRouter
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

Set `USER_AI_SETTINGS_ENCRYPTION_KEY` to a base64-encoded 32-byte key so user-provided OpenRouter credentials can be stored securely.

Generate required secrets:

```bash
# Generate auth secret
openssl rand -hex 32

# Generate encryption key (base64-encoded 32 bytes)
openssl rand -base64 32
```

3. Start the production-like stack:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.

## User Management

Notorium uses an admin approval system to prevent spam. For complete setup instructions, see [USER_APPROVAL_SETUP.md](./USER_APPROVAL_SETUP.md).

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

Set `USER_AI_SETTINGS_ENCRYPTION_KEY` to a base64-encoded 32-byte key so user-provided OpenRouter credentials can be stored securely.

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

Set `USER_AI_SETTINGS_ENCRYPTION_KEY` to a base64-encoded 32-byte key so user-provided OpenRouter credentials can be stored securely.

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
| `USER_AI_SETTINGS_ENCRYPTION_KEY` | Yes        | Base64-encoded 32-byte key used to encrypt user BYOK OpenRouter credentials at rest       |

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
| `bun run test:e2e`          | Run Playwright end-to-end tests      |
| `bun run test:e2e:ui`       | Run Playwright in UI mode            |
| `bun run test:e2e:headed`   | Run Playwright in headed mode        |
| `bun run db:generate`       | Generate Drizzle migrations          |
| `bun run db:migrate`        | Apply Drizzle migrations             |
| `bun run db:push`           | Push schema directly to DB           |

## Project Structure

```text
src/
  api/               API route handlers
  app/               Next.js App Router pages and layouts
  app/(app)/         Authenticated route group
  app/actions/       Server Actions
  app/login/         Login page
  app/signup/        Signup page
  components/        Feature-first UI components
  components/ui/     shadcn/ui primitives
  components/shared/ Shared cross-feature UI
  components/navbar/ Global navigation and preferences
  features/          Feature-scoped queries, mappers, and business logic
  db/                Drizzle client and schema
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

## End-to-End Tests

Playwright e2e coverage lives under `tests/e2e` and currently covers approved, pending, and blocked login states plus basic subject CRUD.

Before the first run, install Playwright browsers:

```bash
bunx playwright install
```

The suite expects the app environment to be configured and the local database to be migrated. It will start the app with `bun dev` unless one is already running.

The Playwright auth fixtures use fixed internal test identities for approved, pending, and blocked users. The e2e-specific environment variables are:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `E2E_USER_PASSWORD` | Yes | Password for end-to-end test users (approved, pending, blocked) |
| `E2E_EMAIL_PREFIX` | No | Prefix used for generated e2e user emails. Defaults to `e2e-`. |
| `E2E_ALLOW_DESTRUCTIVE_RESET` | Yes | Must be `true` to start Playwright e2e. This enables guarded bootstrap auth resets that clear only e2e-prefixed users and instance auth state. |
| `PLAYWRIGHT_BASE_URL` | No | Overrides the base URL used by Playwright. Defaults to `BETTER_AUTH_URL` or `http://localhost:3000`. |

On startup, the auth helpers ensure the e2e users exist and set their access states directly so the suite does not depend on manual admin approval.
Bootstrap reset and global teardown cleanup are scoped to e2e-prefixed identities so e2e users and auth state are cleaned after the run.

## AI Integration

Notorium uses a Bring Your Own Key (BYOK) model for AI features. Users provide their own OpenRouter API key for flashcard generation.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
