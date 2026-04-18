# Docker Guide

Notorium ships with three compose entrypoints.

Audience: developers and self-hosters using Docker or Docker Compose.

Related docs: [Docs Index](../README.md), [Environment Guide](./environment.md), [README](../../README.md)

## Files

| File | Purpose |
| --- | --- |
| `compose.dev.yml` | Local PostgreSQL and Redis for Bun-based development |
| `compose.yml` | Full prod-like stack with migrations and built app |
| `compose.test.yml` | Isolated PostgreSQL and Redis for E2E tests |
| `Dockerfile` | Multi-stage build for app image and migration image |

## Default Development Infrastructure

Use `compose.dev.yml` when running the app directly with Bun.

Start:

```bash
docker compose -f compose.dev.yml up -d
```

This starts:

- PostgreSQL on `127.0.0.1:${POSTGRES_PORT:-5432}`
- Redis on `127.0.0.1:${REDIS_PORT:-6379}`

Then run:

```bash
bun run db:migrate
bun dev
```

## Full Stack Compose

Use `compose.yml` when you want the containerized app path.

Start:

```bash
docker compose up --build -d
```

This stack runs:

- `postgres`
- `redis`
- `migrate` as a one-shot `bun run db:migrate`
- `app` using the built standalone Next.js output

Important behavior:

- the app container runs as a non-root user
- PostgreSQL and Redis are bound to `127.0.0.1`
- the app reads runtime env such as `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RATE_LIMIT_BACKEND`, `REDIS_URL`, and `CRON_SECRET`
- the migration container uses the internal Compose PostgreSQL hostname

Stop:

```bash
docker compose down
```

Remove volumes too:

```bash
docker compose down -v
```

## Test Compose

Use `compose.test.yml` only for Playwright E2E infrastructure.

Start:

```bash
bun run test:e2e:infra:up
```

Stop:

```bash
bun run test:e2e:infra:down
```

This stack starts isolated PostgreSQL and Redis containers and runs a migration container against the test database.

## Scheduler and GitHub Actions

The scheduled reminder workflow is not part of the Docker stack.

- App-side secret: `CRON_SECRET`
- GitHub Actions secret: `NOTORIUM_APP_URL`

The workflow calls:

```bash
curl -X GET \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://your-domain.com/api/notifications/assessments
```
