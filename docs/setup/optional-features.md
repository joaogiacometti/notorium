# Optional Features

For local setup, follow the [README](../../README.md). [`.env.example`](../../.env.example) lists configuration variables; [`src/env.ts`](../../src/env.ts) validates the runtime requirements. The integrations below are optional.

For deployment, configure the database URL, auth secret, and rate-limit backend in your host's environment settings, and set `BETTER_AUTH_URL` to the public app URL. Compose helper variables configure local services, not deployment resources.

## AI

AI features use OpenRouter.

Set both variables:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model identifier, such as `openai/gpt-4.1-mini` |

If either variable is missing, AI controls remain hidden.

Requests include conversation and active material text, which are sent to OpenRouter
and the selected provider. See [Behavior Contracts](../behavior-contracts.md#assistant-trust-and-approval)
for approval and context rules.

Reasoning defaults to `none`: thinking tokens are billed as output and consume the
reply cap. Set `OPENROUTER_REASONING_EFFORT` to `minimal`, `low`, `medium`, or `high`
for models that require reasoning or when you want it enabled. A model that cannot
disable reasoning rejects requests with `none`.

## Attachments

Image and PDF uploads use private Vercel Blob storage. PDFs upload directly from
the browser with a scoped server-issued token. Upload limits are defined in
[`limits.ts`](../../src/lib/config/limits.ts).

Set:

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |

If unset, image and PDF uploads fail with a "No media storage is configured" message.

## Email Sending

Email delivery uses Resend.

Set both variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, for example `Notorium <notifications@example.com>` |

If either variable is missing, email-dependent UI stays hidden or disabled.

Email sending enables password reset. The application's reset Server Action checks approval and a per-user daily cap. Direct Better Auth endpoints need separate verification before relying on those restrictions; see [Behavior Contracts](../behavior-contracts.md#access-and-account-lifecycle).

## Scheduled Jobs

Set `CRON_SECRET` in the app and configure a scheduler. The included workflows use
these repository secrets:

| Repository secret | Purpose |
| --- | --- |
| `NOTORIUM_APP_URL` | Deployed app base URL |
| `CRON_SECRET` | Same value as the app runtime `CRON_SECRET` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Protection Bypass for Automation secret; required when Vercel security protects the endpoint |

| Job | Authenticated GET endpoint | Included workflow |
| --- | --- | --- |
| FSRS optimization | `/api/flashcards/fsrs/optimize` | [Monthly](../../.github/workflows/fsrs-optimization.yml) |
| Orphan-file cleanup | `/api/cron/blob-gc` | [Weekly](../../.github/workflows/blob-gc.yml) |

Both require `Authorization: Bearer <CRON_SECRET>`. The workflows are disabled in
`joaogiacometti/notorium`; in deployment repositories they skip requests when the
app URL or cron secret is missing. Users can also optimize FSRS manually in
account settings without a scheduler.

## Blob Orphan Garbage Collection

The scheduled sweep owns image cleanup after edits, record/subtree deletion,
and discarded drafts. These operations never delete files immediately because
another saved note or flashcard may share the image. The sweep removes
only blobs that no live database row references and that were uploaded more
than 24 hours ago, protecting fresh uploads awaiting a save. The grace period
is measured from upload time, not the removal of the last reference. Account
deletion still purges all files owned by that user.

Cleanup requires `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, and a configured schedule
(or a manual authenticated sweep). Without successful sweeps, unused files remain
in storage and continue to incur storage costs. With the included weekly workflow,
eligible unused images remain until the next successful weekly run.

Pass `?dryRun=1` to report orphan counts without deleting anything.

A safety circuit breaker guards against a regression turning the sweep
destructive: for stores with at least 20 blobs, if orphans exceed half of all scanned blobs, the sweep deletes
nothing, reports `"aborted": true`, and the endpoint returns HTTP 409 so the
scheduled workflow fails loudly for a human to investigate. Legitimate bulk
deletions can also trigger this brake now that the sweep owns all cleanup.
Repeated runs will remain blocked until the orphan fraction drops or an
operator reviews the candidates and explicitly adjusts the sweep options;
the HTTP endpoint does not expose a safety-limit override.

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
