# Contributing to Notorium

This document covers contributor workflow. Setup and environment instructions live in `README.md`. Engineering rules live in `AGENTS.md`. Focused setup and operations guides live under `docs/`.

## Development Flow

1. Sync your branch from the latest default branch state.
2. Install dependencies with `bun install`.
3. Follow the local development setup in `README.md`.
4. Keep changes focused.
5. Update the owning doc when required:
   - behavior changes: `SPEC.md`
   - setup or command changes: `README.md`
   - engineering rule changes: `AGENTS.md`
6. Open a PR with a clear summary, testing notes, and any follow-up work.

## Working Agreement

- Use Bun, not npm.
- Follow `AGENTS.md` for code structure, validation, auth, and testing expectations.
- Keep docs aligned with the live code and scripts.
- Avoid duplicated guidance across Markdown files.

## Before Opening a PR

Run the checks that make sense for your change:

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`
- `bun run test:e2e` for critical workflow changes

If your change affects setup, Docker, env variables, or operational flows, update the related docs in the same PR.

## Pull Request Notes

Include:

- what changed
- why it changed
- how it was validated
- any required env, migration, or deployment follow-up

## Security

Do not open public issues for security vulnerabilities. Use [SECURITY.md](./SECURITY.md).
