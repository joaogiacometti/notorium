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

## Environment Setup

All setup paths require environment configuration:

1. Copy the example file:

```bash
cp .env.example .env
```

2. Generate required secrets:

```bash
# Generate auth secret (for BETTER_AUTH_SECRET)
openssl rand -hex 32

# Generate encryption key (for USER_AI_SETTINGS_ENCRYPTION_KEY)
openssl rand -base64 32

# Generate cron secret (for CRON_SECRET, if using email notifications)
openssl rand -hex 32
```

3. Update `.env` with the generated values.

## Quick Start (Production-like Docker Compose)

1. Install dependencies:

```bash
bun install
```

2. Configure environment (see [Environment Setup](#environment-setup)).

3. Start the production-like stack:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.

## User Management

Notorium uses an admin approval system to prevent spam. For complete setup instructions, see [USER_APPROVAL_SETUP.md](./USER_APPROVAL_SETUP.md).

## Scheduled Assessment Reminders

Notorium can send daily email reminders for upcoming assessments. Users control their notification preferences in account settings, and scheduling is handled by a GitHub Actions workflow that calls the protected notification endpoint once per day.

### GitHub Actions Setup

Configure these GitHub Actions repository secrets:

1. `NOTORIUM_APP_URL` with your deployed app base URL
2. `CRON_SECRET` with the same secret configured in the app environment

The workflow at `.github/workflows/assessment-reminders.yml` runs daily at 9:00 AM UTC and can also be triggered manually with `workflow_dispatch`.

**Timezone Behavior**: The scheduler runs at 9 AM UTC daily. All users receive emails at the same UTC time regardless of their location. Assessment due dates are stored as ISO date strings (YYYY-MM-DD) without time components, and the notification window is calculated based on the user's `notificationDaysBefore` preference (1, 3, or 7 days).

**Note**: User-level notification preferences (`notificationsEnabled` in account settings) work independently. The GitHub workflow only triggers the job; user preferences control who receives emails when it executes.

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

2. Configure environment (see [Environment Setup](#environment-setup)).

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

2. Configure environment (see [Environment Setup](#environment-setup)).

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
| `BLOB_READ_WRITE_TOKEN`          | No          | Vercel Blob storage token for file uploads. Leave unset to disable attachments            |
| `RESEND_API_KEY`                 | No          | Resend API key for email notifications. When unset, email notification preferences are hidden |
| `RESEND_FROM_EMAIL`              | No          | Sender email address for notifications (requires verified domain in Resend)               |
| `CRON_SECRET`                    | No          | Secret for securing the `/api/notifications/assessments` cron endpoint (min 32 chars). Required to enable scheduled assessment reminders |

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
| `bun run test:e2e:infra:up` | Start E2E infrastructure            |
| `bun run test:e2e:infra:down` | Stop E2E infrastructure and remove data |
| `bun run test:e2e:migrate`  | Run migrations against test database |
| `bun run test:e2e`          | Run E2E tests                        |
| `bun run test:e2e:ui`       | Run E2E tests in UI mode             |
| `bun run test:e2e:headed`   | Run E2E tests in headed mode         |
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

E2E tests use an isolated database (`notorium_test`) that is completely separate from your development database. Test credentials are generated automatically at runtime.

### Setup

1. Install Playwright browsers:

```bash
bunx playwright install
```

2. Create test environment file:

```bash
cp .env.test.example .env.test
```

3. Start test infrastructure:

```bash
bun run test:e2e:infra:up
```

This starts PostgreSQL (default port `5433`) and Redis (default port `6380`) in isolated Docker containers and runs database migrations automatically.

### Running Tests

Run the E2E test suite:

```bash
bun run test:e2e
```

The suite starts an isolated production build on `127.0.0.1:3001`, so it can run while your normal `bun dev` server is active on `3000`.

**UI mode:**

```bash
bun run test:e2e:ui
```

**Headed mode:**

```bash
bun run test:e2e:headed
```

### Manual Infrastructure Control

Start/stop test infrastructure separately:

```bash
bun run test:e2e:infra:up      # Start PostgreSQL + Redis
bun run test:e2e:infra:down    # Stop and remove containers + data
```

Re-run migrations manually (e.g. after schema changes):

```bash
bun run test:e2e:migrate
```

The E2E database is completely isolated from your development data, so tests can safely reset the entire database without affecting your work.

## AI Integration

Notorium uses a Bring Your Own Key (BYOK) model for AI features. Users provide their own OpenRouter API key for flashcard generation.

## Email Notifications

Notorium supports optional daily email reminders for upcoming assessments. Users opt in from the Account settings page and choose a lead time (1, 3, or 7 days before the due date).

### Requirements

- `RESEND_API_KEY` — Resend API key for sending emails
- `RESEND_FROM_EMAIL` — Verified sender email address
- `CRON_SECRET` — Secret for securing the cron endpoint (min 32 chars)

When `RESEND_API_KEY` is not configured, email notification preferences are hidden from the Account page.

### Scheduler

The notification system requires a daily trigger at 9:00 AM UTC that calls `GET /api/notifications/assessments` with `Authorization: Bearer <CRON_SECRET>`.

This repository includes `.github/workflows/assessment-reminders.yml`, which triggers the endpoint daily and also supports manual runs through `workflow_dispatch`.

Configure these GitHub repository secrets before enabling it:

- `NOTORIUM_APP_URL`
- `CRON_SECRET`

The workflow performs this request:

```bash
curl -X GET \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://your-domain.com/api/notifications/assessments
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
