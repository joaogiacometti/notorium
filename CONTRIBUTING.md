# Contributing to Notorium

Thank you for your interest in contributing to Notorium! This guide covers the development workflow.

## Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Copy `.env.example` to `.env` and configure your environment
4. Start development services: `docker compose -f compose.dev.yml up -d`
5. Run database migrations: `bun run db:migrate`
6. Start development server: `bun run dev`

For user approval setup, see [USER_APPROVAL_SETUP.md](./USER_APPROVAL_SETUP.md).

## Code Quality Standards

Before submitting any changes, ensure:

```bash
bun run typecheck    # TypeScript validation
bun run lint         # Code formatting and linting
bun run test         # Unit tests
bun run build        # Production build check
```

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components (feature-first)
- `src/features/` - Business logic, queries, and mutations
- `src/lib/` - Cross-feature utilities and infrastructure
- `src/db/` - Database schema and client
- `tests/e2e/` - End-to-end tests

## Coding Guidelines

### General Rules
- No comments in code
- No `console.log` in production code
- Follow Biome rules and TypeScript strict mode
- Use Server Components by default, add `"use client"` only when required

### Database
- Define tables in `src/db/schema.ts` with Drizzle
- Include `createdAt` and `updatedAt` timestamps on every table
- Use `text` type for IDs
- For schema changes: edit schema → `bun run db:generate` → `bun run db:migrate`

### Authentication
- Server-side: use `auth.api.getSession()` from `src/lib/auth/auth.ts`
- Client-side: use `authClient` from `src/lib/auth/auth-client.ts`
- Always check authentication before accessing user data
- Filter user-owned data by `userId` from session

### AI Integration (BYOK)
- Never store or log AI API keys
- All AI features must be BYOK (Bring Your Own Key)
- User AI settings are encrypted at rest
- AI features should gracefully handle missing keys

### Security
- Never expose sensitive information in error messages
- Validate all inputs with Zod schemas
- Use Server Actions as the only client-callable server boundary
- Keep Server Actions thin: authenticate, validate, delegate, revalidate

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the guidelines above
4. Run all quality checks
5. Commit with clear, descriptive messages
6. Push to your fork and create a pull request

## Security

If you discover a security vulnerability, please report it privately rather than opening a public issue. See [SECURITY.md](./SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
