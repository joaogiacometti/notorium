# Notorium

Notorium is a self-hosted knowledge editor. Write notes, read PDFs, and keep what matters in memory with spaced repetition.

Your material is organized into subjects, and each account has its own. You can ask the assistant about your material and review its suggested edits and cards before applying them.

The first person to sign up becomes the admin and can approve later users from **Account → Admin Panel**.

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

Paste the result into `BETTER_AUTH_SECRET` in `.env`. The placeholders let the app start. Replace them with real credentials for the features you want to use: AI, uploads, and email. Then start the services and app:

```bash
docker compose -f compose.dev.yml up -d
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000).

Docker runs PostgreSQL and Redis; the app runs through npm. Stop the services with `docker compose -f compose.dev.yml down`.

## Documentation

- [Run tests and database migrations](./docs/setup/development.md)
- [Understand the architecture](./docs/architecture.md)
- [UI design conventions](./DESIGN.md)
- [Behavior contracts and known verification gaps](./docs/behavior-contracts.md)
- [Contributor and agent rules](./AGENTS.md)

## License

MIT.
