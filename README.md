# Notorium

Notorium is a private study management app for subjects, notes, flashcards, attendance, assessments, and personal search.

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
