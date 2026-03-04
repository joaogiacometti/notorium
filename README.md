# Notorium

Notorium is a study management app for students. It centralizes subjects, notes, flashcards, attendance, and assessments in one place with private, user-scoped data.
The app is localized in English (`en`) and Portuguese (`pt`).

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
- Docker (for local PostgreSQL)
- Upstash Redis REST credentials (required by runtime env validation)

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
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

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_URL` | Yes | Base app URL (local: `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Yes | Secret used by Better Auth (min 32 chars) |
| `BLOB_READ_WRITE_TOKEN` | No | Required for note image attachment upload/serving |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL used by rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token used by rate limiting |

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start development server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run typecheck` | Run TypeScript checks |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format files with Biome |
| `bun run test` | Run Vitest suite |
| `bun run test:watch` | Run Vitest in watch mode |
| `bun run test:coverage` | Run Vitest with coverage |
| `bun run cypress:open` | Open Cypress UI |
| `bun run cypress:run` | Run Cypress headless |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:push` | Push schema directly to DB |

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
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

## Quality Checks

Run before pushing changes:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```
