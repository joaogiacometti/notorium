# Notorium

Notorium is a study management app for students. It centralizes subjects, notes, flashcards, attendance, and assessments in one place with private, user-scoped data.
The app is localized in English (`en`) and Portuguese (`pt`).
Notes and flashcards support rich text and can render images from pasted direct image URLs, supported Imgur share links, and Markdown image syntax.

On subject detail pages, flashcards are shown in a collapsed section and loaded on first expand.
Each subject can also import flashcards from Anki `.txt` exports directly into that subject, preserving supported scheduling metadata when present.
Flashcards also have a dedicated detail page under each subject, and global search results for flashcards open that detail page directly.
Flashcard review uses a memory-state scheduler with per-user parameter tuning and stored review logs, plus keyboard shortcuts for reveal and grading on the review screen.
Profile data transfer is available to all users and supports full export/import for subjects, notes, attendance, assessments, flashcards, and flashcard review settings, plus a template export that excludes notes, attendance, and flashcards.
Account access is approval-based: new users are created as pending, approved users can enter the app, and admins can approve or block users from the Admin Panel in the account menu.

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
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS`   | No          | Override max auth attempts before blocking (default `10`)                                 |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No          | Override auth rate-limit window in seconds (default `60`)                                 |
| `AUTH_RATE_LIMIT_PREFIX`         | No          | Override auth rate-limit Redis key prefix (default `ratelimit:auth`)                      |
| `MAX_IMPORT_BYTES`               | No          | Max accepted JSON import payload size in bytes (default `1048576`)                        |
| `TRUSTED_PROXY_COUNT`            | No          | Number of trusted proxies for forwarded client IP parsing (default `1`)                   |

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
  api/              API route handlers
  app/              Next.js App Router pages and layouts
  app/[locale]/     Localized routes (en, pt)
  app/actions/      Server Actions
  components/       Feature and UI components
  db/               Drizzle client and schema
  i18n/             next-intl routing and request config
  messages/         Translation dictionaries (en.json, pt.json)
  lib/              Shared utilities and auth clients
  env.ts            Environment validation
```

## Localization Rules

- Supported locales are `en` and `pt`.
- Every user-facing string must be added and maintained in both `src/messages/en.json` and `src/messages/pt.json` with matching key paths.
- New pages and redirects must stay compatible with locale-prefixed routes under `src/app/[locale]/`.
- Documentation that defines product behavior (for example `README.md`, `SPEC.md`, `AGENTS.md`) must keep localization requirements explicit and up to date.

## Database Workflow

When changing the schema:

1. Edit `src/db/schema.ts`
2. Do not manually edit files in `drizzle/*.sql` or `drizzle/meta/*`.

## Quality Checks

Run before pushing changes:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```
