# Notorium

Notorium is a self-hosted knowledge editor. Write notes, read PDFs, and keep what matters in memory with spaced repetition.

Keep your material organized by subject, take notes, read PDFs, and review flashcards with FSRS spaced repetition. Exam mode lets you practice without changing your review schedule. Search finds notes, PDF titles, and cards across your library.

If you configure AI, you can ask questions about your material or ask it to draft cards and suggest edits. You review the suggestions before applying them.

Each account has its own material. The first person to sign up becomes the admin and can approve later users from **Account → Admin Panel**.

## Run locally

You'll need Node.js 24, npm, and Docker Compose.

```bash
npm install
cp .env.example .env
```

Generate an auth secret:

```bash
openssl rand -hex 32
```

Paste the result into `BETTER_AUTH_SECRET` in `.env`. Leave the other values at their defaults for local development, then start the services and app:

```bash
docker compose -f compose.dev.yml up -d
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000).

Docker runs PostgreSQL and Redis; the app runs through npm. Stop the services with `docker compose -f compose.dev.yml down`.

## Documentation

- [Configure AI, uploads, email, and scheduled jobs](./docs/setup/optional-features.md)
- [Run tests and database migrations](./docs/setup/development.md)
- [Understand the architecture](./docs/architecture.md)
- [UI design conventions](./DESIGN.md)
- [Behavior contracts and known verification gaps](./docs/behavior-contracts.md)
- [Contributor and agent rules](./AGENTS.md)

## License

MIT.
