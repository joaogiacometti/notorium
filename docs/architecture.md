# Architecture

Notorium keeps framework entrypoints thin and pushes product logic into feature modules.

Audience: agents and contributors making structural, cross-boundary, or feature-module changes.

Related docs: [Docs Index](./README.md), [Agent Guide](../AGENTS.md), [README](../README.md)

## Source Layout

```text
src/
|-- app/                 Next.js App Router pages, layouts, API routes, and Server Actions
|   |-- (app)/           Authenticated pages
|   `-- actions/         Client-callable server boundary
|-- components/          Feature UI, shared UI, navbar, auth forms, and shadcn primitives
|-- features/            Feature queries, mutations, validation, mappers, and domain helpers
|   `-- planning/        Planning route helpers and planning-specific data shaping
|-- db/                  Drizzle schema and database client
|-- lib/                 Auth, server contracts, dates, editor, AI, email, rate limits, storage
`-- env.ts               Runtime environment validation
```

## Data Flow

```text
Server Component -> src/features/*/queries.ts -> Drizzle -> PostgreSQL
Client Component -> src/app/actions/* -> validation/auth -> src/features/*/mutations.ts -> Drizzle
Scheduled Workflow -> src/app/api/* -> auth/config checks -> src/features/* service functions
```

## Ownership Boundaries

- `src/app/` owns framework routing, layouts, pages, API routes, and thin Server Actions.
- `src/components/` owns reusable and feature UI; shadcn primitives stay in `src/components/ui/`.
- `src/features/` owns product read/write logic, validation, mapping, constants, and feature-local types.
- Dense algorithms may live in feature subfolders, such as `src/features/flashcards/fsrs/`.
- Planning-specific URL and view helpers live in `src/features/planning/`.
- `src/db/` owns the Drizzle schema, relations, and database client.
- `src/lib/` owns cross-cutting project helpers and wrappers for external services.
- `src/env.ts` owns runtime environment validation.

Cross-cutting services live behind project-owned helpers in `src/lib/`, including Better Auth, AI providers, email, media storage, and rate limiting.

The rich-text editor and read-only renderer (`src/components/shared/tiptap-editor.tsx` and `tiptap-renderer.tsx`) share their Tiptap extension sets through `src/lib/editor/build*Extensions()` helpers (tables, math). Both surfaces must register the same extensions: Tiptap drops unknown nodes when parsing stored HTML, so math or tables present only in the editor would vanish in the renderer. Math nodes (KaTeX) serialize their LaTeX into a `data-latex` attribute, which `src/lib/editor/rich-text.ts` surfaces as text so equations stay searchable and within length limits.
