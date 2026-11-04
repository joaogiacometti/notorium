# Development

Use Node.js 24 and npm. Docker Compose runs the local database and Redis services.

## Checks and Migrations

See [package.json](../../package.json) for the complete command list.

| Command | Purpose |
| --- | --- |
| `npm run test` | Vitest suite |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run eval` | Assistant checks against the real model in `.env`, three trials per case (`EVAL_TRIALS`); paid, so run manually after prompt, tool, or model changes. The Assistant Evals workflow also runs them on pushes to `main` that change model-visible code, reporting scores on the run's summary page without blocking anything. Transcripts go to `evals/transcripts/` |
| `npm run lint` | Biome and architecture boundaries |
| `npm run typecheck` | TypeScript checks |
| `npm run check:size` | Source and test size guard |
| `npm run check:deadcode` | Unused files and dependencies |
| `npm run db:generate` | Generate migrations after schema changes |
| `npm run db:migrate` | Apply migrations |

Never hand-edit generated migrations. Before committing a schema change, agree on migration generation and any production cleanup or backfill; pushing schema or migration changes to `main` triggers production migration.

Lefthook installs on `npm install`. It checks staged files before commits and runs lint, type checks, tests, size, and dead-code checks before pushes. CI checks and E2E jobs run in `joaogiacometti/notorium`; scheduled operations run in deployment repositories.

## Isolated E2E Tests

Playwright uses PostgreSQL and Redis from `compose.test.yml`, separate from local development. [`.env.test.example`](../../.env.test.example) defines the isolated service ports and app URL.

Playwright configures local email and media fixtures under `test-results/` instead of calling Resend or Vercel Blob. Never set `NOTORIUM_EMAIL_FIXTURE_*` or `NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR` on a deployment.

```bash
cp .env.test.example .env.test
npx playwright install chromium   # once
npm run test:e2e:infra:up
npm run test:e2e:migrate
npm run test:e2e
npm run test:e2e:infra:down
```

The final command removes the isolated test services and their volumes.
