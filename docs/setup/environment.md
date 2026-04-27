# Environment Guide

`src/env.ts` is the validated runtime contract for the application. If the app requires a variable at runtime, keep it represented there.

Audience: developers, deployers, and agents configuring the app.

Related docs: [Docs Index](../README.md), [Optional Features](./optional-features.md), [Docker Guide](./docker.md), [README](../../README.md)

## Basic Local Workflow

The basic workflow only needs PostgreSQL, Redis, and Better Auth configuration.

1. Copy `.env.example` to `.env`
2. Set `BETTER_AUTH_SECRET` to a random value of at least 32 characters
3. Keep `RATE_LIMIT_BACKEND=redis`
4. Start local services with `docker compose -f compose.dev.yml up -d`
5. Run `bun run db:migrate`
6. Run `bun dev`

Recommended local defaults:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `postgresql://postgres:change-this-password@localhost:5432/notorium` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `RATE_LIMIT_BACKEND` | `redis` |
| `REDIS_URL` | `redis://localhost:6379` |

Optional feature variables are not required for this workflow. Leave them commented until you enable the related feature.

## Runtime Variables

### Required

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by the app and migrations |
| `BETTER_AUTH_URL` | Public base URL for the app |
| `BETTER_AUTH_SECRET` | Better Auth secret, minimum 32 characters |
| `RATE_LIMIT_BACKEND` | `redis` or `upstash` |

### Conditional

| Variable | Required when |
| --- | --- |
| `REDIS_URL` | `RATE_LIMIT_BACKEND=redis` |
| `UPSTASH_REDIS_REST_URL` | `RATE_LIMIT_BACKEND=upstash` |
| `UPSTASH_REDIS_REST_TOKEN` | `RATE_LIMIT_BACKEND=upstash` |

### Optional Features

| Variable | Effect when present |
| --- | --- |
| `OPENROUTER_API_KEY` | Enables instance-level AI features when paired with `OPENROUTER_MODEL` |
| `OPENROUTER_MODEL` | Selects the OpenRouter model for AI features |
| `BLOB_READ_WRITE_TOKEN` | Enables attachment uploads |
| `RESEND_API_KEY` | Enables email delivery when paired with `RESEND_FROM_EMAIL` |
| `RESEND_FROM_EMAIL` | Sender address for reminder emails |
| `CRON_SECRET` | Secures scheduled reminder triggers |

See [Optional Features](./optional-features.md) for setup details.

## Non-Runtime Variables

These values are useful for local tooling and deployment workflows, but they are not validated by `src/env.ts`.

| Variable | Used by |
| --- | --- |
| `POSTGRES_USER` | `compose.yml`, `compose.dev.yml`, `compose.test.yml` |
| `POSTGRES_PASSWORD` | Compose files |
| `POSTGRES_DB` | Compose files |
| `POSTGRES_PORT` | Compose files |
| `REDIS_PORT` | Compose files |
| `APP_PORT` | `compose.yml` port mapping |
| `PLAYWRIGHT_BASE_URL` | Playwright E2E support code and CI |
| `NOTORIUM_APP_URL` | GitHub Actions reminder workflow secret |

## Test Environment

`.env.test.example` is for isolated E2E runs only.

Use:

```bash
cp .env.test.example .env.test
```

Defaults:

| Variable | Value |
| --- | --- |
| `POSTGRES_PORT` | `5433` |
| `REDIS_PORT` | `6380` |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3001` |
