# Environment Guide

`src/env.ts` is the validated runtime contract for the application. If a variable is required by the app itself, it should be represented there.

Audience: developers, deployers, and agents configuring the app.

Related docs: [Docs Index](../README.md), [Docker Guide](./docker.md), [README](../../README.md)

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

### Optional features

| Variable | Effect when present |
| --- | --- |
| `OPENROUTER_API_KEY` | Enables instance-level AI features when paired with `OPENROUTER_MODEL` |
| `OPENROUTER_MODEL` | Selects the OpenRouter model for AI features |
| `BLOB_READ_WRITE_TOKEN` | Enables attachment uploads |
| `RESEND_API_KEY` | Enables email delivery when paired with `RESEND_FROM_EMAIL` |
| `RESEND_FROM_EMAIL` | Sender address for reminder emails |
| `CRON_SECRET` | Secures the reminder endpoint |

## Non-Runtime Variables

These values are useful for local tooling, but they are not validated by `src/env.ts`:

| Variable | Used by |
| --- | --- |
| `POSTGRES_USER` | `compose.yml`, `compose.dev.yml`, `compose.test.yml` |
| `POSTGRES_PASSWORD` | compose files |
| `POSTGRES_DB` | compose files |
| `POSTGRES_PORT` | compose files |
| `REDIS_PORT` | compose files |
| `APP_PORT` | `compose.yml` port mapping |
| `PLAYWRIGHT_BASE_URL` | Playwright E2E support code and CI |
| `NOTORIUM_APP_URL` | GitHub Actions reminder workflow secret, not app runtime |

## Local Development

For the default local workflow:

1. Copy `.env.example` to `.env`
2. Fill in `BETTER_AUTH_SECRET`
3. Keep `RATE_LIMIT_BACKEND=redis`
4. Start infrastructure with `docker compose -f compose.dev.yml up -d`
5. Run the app with `bun dev`

Recommended local defaults:

- `BETTER_AUTH_URL=http://localhost:3000`
- `DATABASE_URL=postgresql://postgres:change-this-password@localhost:5432/notorium`
- `REDIS_URL=redis://localhost:6379`

## Optional Features

### AI

Set both:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

If either is missing, AI controls remain hidden.

### Attachments

Set:

- `BLOB_READ_WRITE_TOKEN`

If unset, attachment upload features remain disabled.

### Email reminders

Set all of:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

If email env is missing, the reminder endpoint returns `503` and account notification preferences are hidden.

## Test Environment

`.env.test.example` is for isolated E2E runs only.

- Default test PostgreSQL port: `5433`
- Default test Redis port: `6380`
- Default test app URL: `http://127.0.0.1:3001`

Use:

```bash
cp .env.test.example .env.test
```
