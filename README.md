# Notorium

Notorium is a private, self-hosted study workspace for students. It organizes everything around **subjects** — academic ones track attendance and assessments, while every subject holds documents (rich-text notes and mindmaps), flashcards, and PDF books. Spaced-repetition review, optional AI assistance, and fast cross-app search tie it together.

It is built for a single trusted group: the first account becomes an admin, and everyone else needs approval before they can sign in.

## Features

- **Subjects** — a nestable tree of academic or general subjects, navigated from a persistent sidebar with drag-and-drop reorganization.
- **Notes** — rich-text notes with tables, syntax-highlighted code, and searchable LaTeX math (KaTeX), edited inline with autosave.
- **Mindmaps** — free-form React Flow canvases scoped to a subject, exportable as PNG.
- **Flashcards** — basic, cloze, and image-occlusion cards organized by subject, reviewed with an FSRS spaced-repetition scheduler. Focus Mode and Exam Mode tune the review session.
- **Library** — upload PDF books and read them in an in-app reader with zoom, two-page spread, thumbnails, outline navigation, per-device saved reading position, text selection, and highlights with notes.
- **Attendance & Assessments** — per-subject absence tracking and an assessment planner with a calendar/planning view and optional email reminders.
- **AI assistance (optional)** — generate flashcards from notes, mindmaps, or a selected PDF passage, refine and de-duplicate decks, and ask questions about a passage.
- **Search, command palette, and floating windows** — case-insensitive search across all content (`Cmd/Ctrl+K`), an action palette (`Cmd/Ctrl+P`), and draggable editor windows that layer over the page (e.g. take notes or edit flashcards while reading a PDF).

See [SPEC.md](./SPEC.md) for the full, authoritative behavior of every feature.

## Prerequisites

- Bun
- Docker with Docker Compose

## Quick Start

1. Install dependencies:

```bash
bun install
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
bun run db:migrate
```

6. Start the app:

```bash
bun dev
```

Open `http://localhost:3000`.

## First Admin

The first account created on a new instance becomes an approved admin automatically. Later accounts start as pending and require admin approval.

## Common Commands

| Command | Description |
| --- | --- |
| `bun dev` | Start the Next.js development server |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run test` | Run the Vitest suite |
| `bun run test:coverage` | Run tests and enforce coverage thresholds |
| `bun run lint` | Run Biome checks, including architecture boundaries |
| `bun run check:size` | Fail on source files over 500 lines |

Git hooks (via [Lefthook](https://lefthook.dev), `lefthook.yml`) install automatically on `bun install` and run these guards before each commit and push.

## More Docs

- [Docs Index](./docs/README.md): setup, configuration, Docker, optional features, and operations
- [Architecture](./docs/architecture.md): source layout, data flow, and ownership boundaries
- [SPEC.md](./SPEC.md): product behavior and acceptance criteria
- [AGENTS.md](./AGENTS.md): engineering rules, architecture guidance, and testing expectations
- [CONTRIBUTING.md](./CONTRIBUTING.md): contributor workflow
- [SECURITY.md](./SECURITY.md): vulnerability reporting

## License

This project is licensed under the MIT License.
