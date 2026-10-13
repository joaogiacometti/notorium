# Docker Guide

Notorium ships with two Compose entrypoints. Both only provide local PostgreSQL and Redis; the app itself runs with npm and is not shipped as a Docker image.

Audience: developers using Docker Compose for local infrastructure.

Related docs: [Docs Index](../README.md), [Environment Guide](./environment.md), [Optional Features](./optional-features.md), [README](../../README.md)

## Files

| File | Purpose |
| --- | --- |
| `compose.dev.yml` | Local PostgreSQL and Redis for npm-based development |
| `compose.test.yml` | Isolated PostgreSQL and Redis for E2E tests |

## Default Development Infrastructure

Use `compose.dev.yml` when running the app directly with npm.

Start:

```bash
docker compose -f compose.dev.yml up -d
```

This starts:

- PostgreSQL on `127.0.0.1:${POSTGRES_PORT:-5432}`
- Redis on `127.0.0.1:${REDIS_PORT:-6379}`

Then run:

```bash
npm run db:migrate
npm run dev
```

Stop:

```bash
docker compose -f compose.dev.yml down
```

## Test Compose

Use `compose.test.yml` only for Playwright E2E infrastructure.

Start:

```bash
npm run test:e2e:infra:up
```

Stop:

```bash
npm run test:e2e:infra:down
```

This stack starts isolated PostgreSQL and Redis containers. Apply migrations to the test database with:

```bash
npm run test:e2e:migrate
```

Install the Playwright browser once with `npx playwright install chromium`.
