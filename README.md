# Notorium

Notorium is a private study management app for students. It combines subjects, notes, flashcards, attendance, assessments, and personal search in one place.

This README owns setup, local development, runtime commands, and environment guidance. Product behavior lives in `SPEC.md`. Engineering rules for contributors and agents live in `AGENTS.md`.

## Architecture

Notorium keeps framework entrypoints thin and pushes product logic into feature modules.

```text
src/
├── app/                 Next.js App Router pages, layouts, API routes, and Server Actions
│   ├── (app)/           Authenticated pages
│   └── actions/         Client-callable server boundary
├── components/          Feature UI, shared UI, navbar, auth forms, and shadcn primitives
├── features/            Feature queries, mutations, validation, mappers, and domain helpers
├── db/                  Drizzle schema and database client
├── lib/                 Auth, server contracts, dates, editor, AI, email, rate limits, storage
└── env.ts               Runtime environment validation
```

Primary flow:

```text
Server Component -> src/features/*/queries.ts -> Drizzle -> PostgreSQL
Client Component -> src/app/actions/* -> validation/auth -> src/features/*/mutations.ts -> Drizzle
```

Cross-cutting services live behind project-owned helpers in `src/lib/`, including Better Auth, AI providers, email, media storage, and rate limiting.

## Quick Start

The primary local development path is:

1. Install dependencies:

```bash
bun install
```

2. Create your app env file:

```bash
cp .env.example .env
```

3. Generate required secrets and place them in `.env`:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one value for `BETTER_AUTH_SECRET`. Use the other for `CRON_SECRET` only if you plan to enable scheduled assessment reminders.

4. Start local infrastructure:

```bash
docker compose -f compose.dev.yml up -d
```

5. Run migrations:

```bash
bun run db:migrate
```

6. Start the app:

```bash
bun dev
```

Open `http://localhost:3000`.

## Supported Run Modes

### Local development

- App runtime: `bun dev`
- Infrastructure: `docker compose -f compose.dev.yml up -d`
- Best for day-to-day feature work

### Self-host / prod-like local stack

- Full stack: `docker compose up --build -d`
- Runs PostgreSQL, Redis, a one-shot migration container, and the built app
- Best for validating the containerized deployment path

### E2E test infrastructure

- Test infra: `bun run test:e2e:infra:up`
- Test app/test suite: `bun run test:e2e`
- Uses `.env.test.example` as the template for `.env.test`

## Environment

`src/env.ts` is the runtime source of truth for app env validation.

Required app runtime variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RATE_LIMIT_BACKEND=redis` with `REDIS_URL`, or `RATE_LIMIT_BACKEND=upstash` with both Upstash variables

Optional feature variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

Compose helper variables such as `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `REDIS_PORT`, and `APP_PORT` are used by the compose files, not by `src/env.ts`.

Focused guides:

- [Environment Guide](./docs/setup/environment.md)
- [Docker Guide](./docs/setup/docker.md)
- [Docs Index](./docs/README.md)

## First Admin and User Approval

- The first account created on a new instance becomes an approved admin automatically.
- Later accounts start as `pending` and require admin approval.
- Operational details are in [User Approval Guide](./docs/operations/user-approval.md).

## Scheduled Assessment Reminders

Assessment reminders are optional.

- App env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`
- External scheduler secret: `NOTORIUM_APP_URL` in GitHub Actions, set to your deployed base URL
- Trigger endpoint: `GET /api/notifications/assessments` with `Authorization: Bearer <CRON_SECRET>`

The repository includes `.github/workflows/assessment-reminders.yml` for a daily GitHub Actions trigger.

## Docs Map

- Start here in `README.md` for local setup, runtime commands, and entry-level environment guidance.
- Use [docs/setup/environment.md](./docs/setup/environment.md) for env variable roles and optional feature configuration.
- Use [docs/setup/docker.md](./docs/setup/docker.md) for Compose and container workflows.
- Use [docs/operations/user-approval.md](./docs/operations/user-approval.md) for admin approval operations.
- Use [docs/README.md](./docs/README.md) for the full docs index.
- Use `SPEC.md` for product behavior and `AGENTS.md` for engineering rules.

## Commands

| Command | Description |
| --- | --- |
| `bun dev` | Start the Next.js development server |
| `bun run build` | Build the production app |
| `bun run start` | Start the production server |
| `bun run typecheck` | Run TypeScript checks |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format files with Biome |
| `bun run test` | Run the Vitest suite |
| `bun run test:watch` | Run Vitest in watch mode |
| `bun run test:coverage` | Run Vitest with coverage |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:push` | Push schema directly to the database |
| `bun run test:e2e:infra:up` | Start isolated E2E PostgreSQL and Redis containers |
| `bun run test:e2e:infra:down` | Stop isolated E2E containers and remove test data |
| `bun run test:e2e:migrate` | Run migrations against the E2E database |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run test:e2e:ui` | Run Playwright in UI mode |
| `bun run test:e2e:headed` | Run Playwright in headed mode |

## Project Docs

- `README.md`: setup, runtime, local development, commands, environment
- `SPEC.md`: product behavior and acceptance criteria
- `AGENTS.md`: coding rules, architecture guidance, testing expectations
- `CONTRIBUTING.md`: contributor workflow
- `SECURITY.md`: vulnerability reporting and security policy
- `docs/`: focused setup and operational guides

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the MIT License.
