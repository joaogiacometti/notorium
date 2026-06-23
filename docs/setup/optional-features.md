# Optional Features

Notorium can run with only the required environment from [Environment Guide](./environment.md). The features below are optional, plugin-like capabilities that become available when their environment variables are configured.

Audience: deployers and maintainers enabling integrations beyond the basic local workflow.

Related docs: [Docs Index](../README.md), [Environment Guide](./environment.md), [Docker Guide](./docker.md), [README](../../README.md)

## AI

AI features use OpenRouter.

Set both variables:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model identifier, such as `openai/gpt-4.1-mini` |

If either variable is missing, AI controls remain hidden.

## Attachments

Attachment uploads use Vercel Blob.

Set:

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |

If unset, attachment upload features remain disabled.

## Email Sending

Email delivery uses Resend.

Set both variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, for example `Notorium <notifications@example.com>` |

If either variable is missing, email-dependent UI stays hidden or disabled.

Email sending enables password reset and assessment reminders. Password reset is limited to approved users and at most 3 reset emails per approved user per UTC day.

## Scheduled Assessment Reminders

Scheduled reminders require email sending plus a cron trigger secret.

Set app runtime variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Enables Resend email delivery |
| `RESEND_FROM_EMAIL` | Sender used for reminder emails |
| `CRON_SECRET` | Random secret of at least 32 characters |

Generate a secret with:

```bash
openssl rand -hex 32
```

The reminder endpoint is:

```text
GET /api/notifications/assessments
Authorization: Bearer <CRON_SECRET>
```

The repository includes `.github/workflows/assessment-reminders.yml` for a daily GitHub Actions trigger. Configure these repository secrets in your fork or deployment repository:

| Secret | Purpose |
| --- | --- |
| `NOTORIUM_APP_URL` | Deployed app base URL |
| `CRON_SECRET` | Same value as the app runtime `CRON_SECRET` |

The workflow skips itself when either secret is missing.

## FSRS Optimization Workflow

Users can manually optimize flashcard FSRS parameters from the Flashcards section of the account settings dialog.
Automatic optimization is available only when `CRON_SECRET` is configured.

The automatic optimization endpoint is:

```text
GET /api/flashcards/fsrs/optimize
Authorization: Bearer <CRON_SECRET>
```

The repository includes `.github/workflows/fsrs-optimization.yml` for a monthly GitHub Actions trigger. Configure these repository secrets in your fork or deployment repository:

| Secret | Purpose |
| --- | --- |
| `NOTORIUM_APP_URL` | Deployed app base URL |
| `CRON_SECRET` | Same value as the app runtime `CRON_SECRET` |

The workflow skips itself when either secret is missing.

## Blob Orphan Garbage Collection

Deleting content removes its blobs immediately. As a safety net for blobs left
behind by cascade deletes or transient delete failures, a sweep removes blobs
that no live database row references and that are older than a 24-hour grace
period (so freshly uploaded blobs awaiting their database reference are never
collected). Requires `BLOB_READ_WRITE_TOKEN` and `CRON_SECRET`.

The sweep endpoint is:

```text
GET /api/cron/blob-gc
Authorization: Bearer <CRON_SECRET>
```

Pass `?dryRun=1` to report orphan counts without deleting anything.

A safety circuit breaker guards against a regression turning the sweep
destructive: if orphans exceed half of all scanned blobs, the sweep deletes
nothing, reports `"aborted": true`, and the endpoint returns HTTP 409 so the
scheduled workflow fails loudly for a human to investigate. A healthy store is
mostly referenced, so a sweep wanting to delete most of it signals a broken
reference collector or a save path stranding uploads — not real garbage.

The repository includes `.github/workflows/blob-gc.yml` for a weekly GitHub Actions trigger. Configure these repository secrets in your fork or deployment repository:

| Secret | Purpose |
| --- | --- |
| `NOTORIUM_APP_URL` | Deployed app base URL |
| `CRON_SECRET` | Same value as the app runtime `CRON_SECRET` |

The workflow skips itself when either secret is missing.

## Upstash Rate Limiting

The default local setup uses Redis through `RATE_LIMIT_BACKEND=redis` and `REDIS_URL`.

Use Upstash when deploying without a managed Redis connection string.

Set:

| Variable | Purpose |
| --- | --- |
| `RATE_LIMIT_BACKEND` | Set to `upstash` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

When `RATE_LIMIT_BACKEND=upstash`, both Upstash variables are required by runtime validation.
