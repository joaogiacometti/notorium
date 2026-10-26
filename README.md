# Notorium

Notorium is a private, self-hosted learning workspace. It focuses on producing, reviewing, and asking about study material with AI, not on school management. Everything lives in **subjects**, folders that hold documents (rich-text notes and mindmaps) and flashcards. Spaced-repetition review, optional AI assistance, and fast personal search tie it together.

It is built for a single trusted group: the first account becomes an admin, and everyone else needs approval before they can sign in.

## Features

- **Subjects** — a nestable folder tree, navigated from a persistent sidebar with drag-and-drop reorganization.
- **Notes** — rich-text notes with a compact formatting toolbar, tables, syntax-highlighted code, image uploads, and searchable LaTeX math (KaTeX), edited inline with autosave.
- **Mindmaps** — branch-ordered React Flow canvases scoped to a subject, exportable as PNG.
- **Flashcards** — front/back cards organized by subject, reviewed with an FSRS spaced-repetition scheduler. Dedicated review and exam session pages tune the review session. Cards created from an open note or mindmap retain a source link in card details, the edit dialog, and revealed review/exam answers; links follow document renames and moves.
- **AI assistance (optional)** — improve struggling flashcards and use one global study assistant sidebar across pages, review, and editing. Ask the assistant to create flashcards from the open note or mindmap. It receives the current review card (an unrevealed answer is used only to check hints and attempts), note, mindmap, or unsaved flashcard draft as context. Document excerpts are capped at 12,000 characters. By default it tutors hint-first on problems and unrevealed cards (asking for the answer still gets it; toggle Hints first off to skip hints). It can propose new flashcards, suggest changes to the active flashcard draft with per-field approval inside the editor, and propose targeted note or mindmap changes previewed inside the document with one Accept/Discard decision. Accepted document changes use normal autosave and undo. All AI features share the `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` settings.
- **Search and command palette** — case- and accent-insensitive search across notes, mindmaps, and flashcards (`Cmd/Ctrl+K`) and an action palette (`Cmd/Ctrl+P`).

See [SPEC.md](./SPEC.md) for the full, authoritative behavior of every feature.

## Prerequisites

- Node.js 24 with npm
- Docker with Docker Compose

On NixOS, `nix develop` (or `direnv allow`, which loads it automatically via `.envrc`) provides Node.js 24 and a Nix-built Biome from `flake.nix`. It also points Playwright at Nix-built browsers, so skip `npx playwright install`. Docker still comes from your system config.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Generate a Better Auth secret and set `BETTER_AUTH_SECRET` in `.env`:

```bash
openssl rand -hex 32
```

The defaults in `.env.example` are enough for the basic local workflow.

4. Start PostgreSQL and Redis:

```bash
docker compose -f compose.dev.yml up -d
```

5. Run database migrations:

```bash
npm run db:migrate
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

`compose.dev.yml` only provides PostgreSQL (`127.0.0.1:${POSTGRES_PORT:-5432}`) and Redis (`127.0.0.1:${REDIS_PORT:-6379}`); the app itself runs with npm. Stop them with `docker compose -f compose.dev.yml down`.

## E2E Tests

Playwright runs against an isolated PostgreSQL and Redis stack from `compose.test.yml`.

```bash
cp .env.test.example .env.test
npx playwright install chromium   # once; not needed in the Nix shell
npm run test:e2e:infra:up
npm run test:e2e:migrate
npm run test:e2e
npm run test:e2e:infra:down
```

## First Admin

The first account created on a new instance becomes an approved admin automatically. Later accounts start as pending and require admin approval.

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:generate` | Generate migrations after changing the schema |
| `npm run test` | Run the Vitest suite |
| `npm run test:coverage` | Run tests and enforce coverage thresholds |
| `npm run lint` | Run Biome checks, including architecture boundaries |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run check:size` | Enforce 500-line source and 800-line test limits (schema exempt) |
| `npm run check:deadcode` | Fail on unused files and dependencies (Knip) |

After changing the schema, run `npm run db:generate` and `npm run db:migrate` inside the Nix development shell before starting the app.

Git hooks (via [Lefthook](https://lefthook.dev), `lefthook.yml`) install automatically on `npm install` and run Biome on staged files before commits and lint, type checks, tests, file-size, and dead-code guards before pushes. CI checks and E2E jobs run in `joaogiacometti/notorium`; scheduled operations run in deployment repositories instead.

## More Docs

- [Docs Index](./docs/README.md): setup, configuration, optional features, and operations
- [Architecture](./docs/architecture.md): source layout, data flow, and ownership boundaries
- [Design System](./DESIGN.md): spacing, surfaces, typography, z-index layers, and UI conventions
- [SPEC.md](./SPEC.md): product behavior and acceptance criteria
- [AGENTS.md](./AGENTS.md): engineering rules, architecture guidance, and testing expectations

## License

This project is licensed under the MIT License.
