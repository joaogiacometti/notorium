# Optional Features

Notorium can run with only the required environment from [Environment Guide](./environment.md). The features below are optional, plugin-like capabilities that become available when their environment variables are configured.

Audience: deployers and maintainers enabling integrations beyond the basic local workflow.

Related docs: [Docs Index](../README.md), [Environment Guide](./environment.md), [README](../../README.md)

## AI

AI features use OpenRouter.

Set both variables:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model identifier, such as `openai/gpt-4.1-mini` |

If either variable is missing, AI controls remain hidden.

The study assistant is a shared collapsible sidebar across pages, review, and flashcard editing. Each message includes the active study content: the review/exam card (an unrevealed answer is marked hidden and only checks hints and attempts), the unsaved note, or the current flashcard editor draft. Document draft excerpts are capped at 12,000 characters with a partial-context indicator, and attachment URLs are omitted. Context uses already loaded content with no background AI calls. Asking to change an open document sends its current unsaved draft, prioritizing selected note blocks. Flashcard suggestions are approved per field inside the editor; note suggestions preview inside the document with one Accept/Discard decision. Accept changes uses the editor’s existing autosave and undo. Proposals cannot overwrite newer edits or target omitted content. The assistant output cap is 4,000 tokens. This uses the assistant message allowance and needs no additional configuration or database migration. Conversations remain in browser memory. The Hints first toggle (on by default) makes the assistant give graduated hints before full solutions, while an explicit request for the answer still gets it right away; it is a prompt mode with no extra AI calls, and the choice is remembered in a browser cookie. Asking about a review card before revealing it shows a note suggesting Hard or Again on reveal.

AI flashcard creation uses the study assistant, including requests based on an open note. The assistant proposes up to five cards per reply for confirmation before saving. There are no separate document generation actions.

Every AI call (the study assistant and flashcard back improvement) runs with thinking turned off (`none`) by default: thinking tokens are billed as output tokens and count against each call's output cap, so they can cut an answer short. Set `OPENROUTER_REASONING_EFFORT` (`none`, `minimal`, `low`, `medium`, or `high`) to change it. You must set it to something other than `none` for a model whose reasoning cannot be turned off, or that model rejects every AI request.

AI output follows the user's applicable explicit output-language instruction, otherwise the language of their latest request, including short follow-ups, even when source material is in another language. Only ambiguous or language-neutral requests inherit language from earlier user messages. This applies to assistant replies and new or rewritten flashcard prose; code identifiers, quotations, studied-language content, and unrelated text in targeted edits remain intact. Refine's standalone back improvement preserves the existing card's language.

The study assistant sends each chat's id to OpenRouter as `session_id`. This supplies a session identifier for provider routing and prompt-cache reuse; availability and savings depend on the selected model and provider. System instructions stay stable; only the current editor tool is exposed alongside creation and search, and switching editor kinds can reduce prompt-cache reuse.

## Attachments

Attachment uploads use Vercel Blob. Files are limited to 4 MiB and multipart bodies to 4 MiB plus 64 KiB. Each authenticated attempt consumes the 200-per-day upload allowance before the body is read, including invalid and oversized attempts.

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

Email sending enables password reset. Password reset is limited to approved users and at most 3 reset emails per approved user per UTC day.

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
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Protection Bypass for Automation secret; required when Vercel security protects the endpoint |

The workflow is disabled in `joaogiacometti/notorium`. In deployment repositories, it skips the request when `NOTORIUM_APP_URL` or `CRON_SECRET` is missing.

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
in storage and continue to incur storage costs. With the weekly workflow below,
eligible unused images remain until the next successful weekly run.

The sweep endpoint is:

```text
GET /api/cron/blob-gc
Authorization: Bearer <CRON_SECRET>
```

Pass `?dryRun=1` to report orphan counts without deleting anything.

A safety circuit breaker guards against a regression turning the sweep
destructive: for stores with at least 20 blobs, if orphans exceed half of all scanned blobs, the sweep deletes
nothing, reports `"aborted": true`, and the endpoint returns HTTP 409 so the
scheduled workflow fails loudly for a human to investigate. Legitimate bulk
deletions can also trigger this brake now that the sweep owns all cleanup.
Repeated runs will remain blocked until the orphan fraction drops or an
operator reviews the candidates and explicitly adjusts the sweep options;
the HTTP endpoint does not expose a safety-limit override.

The repository includes `.github/workflows/blob-gc.yml` for a weekly GitHub Actions trigger. Configure these repository secrets in your fork or deployment repository:

| Secret | Purpose |
| --- | --- |
| `NOTORIUM_APP_URL` | Deployed app base URL |
| `CRON_SECRET` | Same value as the app runtime `CRON_SECRET` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Protection Bypass for Automation secret; required when Vercel security protects the endpoint |

The workflow is disabled in `joaogiacometti/notorium`. In deployment repositories, it skips the request when `NOTORIUM_APP_URL` or `CRON_SECRET` is missing.

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
