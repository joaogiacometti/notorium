# Notorium

Notorium is a study management app for students. It centralizes subjects, notes, attendance, and assessments in one place with private, user-scoped data.

## Current Status

Based on `SPEC.md`:

- [x] Authentication (email/password, sessions, logout)
- [x] Subject CRUD
- [x] Notes CRUD with Markdown support
- [x] Attendance tracking and miss history
- [x] Assessment planner (types, statuses, due dates, averages)
- [x] Subject module toggles (notes, attendance, assessments)
- [x] Global search across subjects and notes
- [x] Image attachments for notes
- [ ] Search result caching
- [ ] Mobile fullscreen image viewer mode

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- React 19 + TypeScript 5
- PostgreSQL + Drizzle ORM
- Better Auth
- Zod + React Hook Form
- Tailwind CSS 4 + shadcn/ui
- Biome
- Bun

## Requirements

- Bun
- Docker (for local PostgreSQL)

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Run database migrations:

```bash
bun run db:migrate
```

5. Start the development server:

```bash
bun dev
```

Open `http://localhost:3000`.

## Environment Variables

Defined in `src/env.ts`:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_URL` | Yes | Base app URL (local: `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Yes | Secret used by Better Auth (min 32 chars) |
| `BLOB_READ_WRITE_TOKEN` | No | Required for note image attachment upload/serving |

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start development server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format files with Biome |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:push` | Push schema directly to DB |

## Project Structure

```text
src/
  api/              API route handlers
  app/              Next.js App Router pages and layouts
  app/actions/      Server Actions
  components/       Feature and UI components
  db/               Drizzle client and schema
  lib/              Shared utilities and auth clients
  env.ts            Environment validation
```

## Database Workflow

When changing the schema:

1. Edit `src/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

## Quality Checks

Run before pushing changes:

```bash
bun run lint
bun run build
```
