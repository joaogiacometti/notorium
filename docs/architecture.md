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
- Flashcard refine (streak detection, similar-card discovery, relate/merge mutations) lives in `src/features/flashcards/refine/`, with its Server Actions in `src/app/actions/flashcards-refine.ts`. The UI is a mode of the manage view in `src/components/flashcards/manage/` (refine results table, merge/improve dialogs, `use-refine-card-actions.ts`), entered from the manage toolbar AI dropdown. Merges snapshot source cards into the `flashcard_merge_log` table so lineage survives deletion.
- Cloze flashcards: parsing and per-ordinal front/back rendering of `{{cN::answer}}` sources live in `src/features/flashcards/cloze.ts`; the fan-out/sibling-sync/note-delete write logic lives in `src/features/flashcards/cloze-mutations.ts` (delegated to from `mutations.ts`). The `flashcard` row stays the scheduled unit: each deletion ordinal is its own row sharing a `clozeNoteId`, with `type`/`clozeOrdinal`/`clozeSource` columns. Front/back are pre-rendered at write time so review, search, and the manage table read them unchanged. Bulk mutations were split into `src/features/flashcards/bulk-mutations.ts` to keep `mutations.ts` focused.
- Image occlusion flashcards follow the same sibling pattern as cloze. Region geometry and derived-content helpers live in `src/features/flashcards/occlusion.ts` (pure, also imported by `db/schema.ts` for column typing and by client components for pixel↔normalized projection); the fan-out/sibling-sync/note-delete write logic plus source-image blob cleanup live in `src/features/flashcards/occlusion-mutations.ts` (delegated to from `mutations.ts`). Each mask region is its own row sharing an `occlusionNoteId`, with `occlusionMaskId`/`occlusionImagePathname`/`occlusionRegions` (jsonb, normalized 0..1) columns; `front`/`frontNormalized`/`back` hold derived text so search and the manage table read them unchanged. The source image uploads via `uploadFlashcardOcclusionImage` (returns the blob pathname, unlike the editor image upload). Authoring UI (`react-rnd` drag/resize masks) and the review/preview renderer live in `src/components/flashcards/occlusion/`.
- Planning-specific URL and view helpers live in `src/features/planning/`.
- Notes and mindmaps are both subject-scoped and surfaced together in a subject's "Documents" area under `src/app/(app)/subjects/[id]/documents/` (`documents/` list, `documents/notes/[noteId]/`, `documents/mindmaps/[mindmapId]/`). `src/features/documents/` is a thin read layer that merges `src/features/notes` and `src/features/mindmaps` results into one recency-ordered list (`DocumentListItem`) for the shared `src/components/documents/` sidebar and previews.
- Mindmaps (`src/features/mindmaps/`) are scoped by `userId` and `subjectId` (mirroring notes). The free-form canvas uses React Flow (`@xyflow/react`), loaded client-side, and persists its node/edge graph as JSON in the `mindmap.data` column.
- `src/db/` owns the Drizzle schema, relations, and database client.
- `src/lib/` owns cross-cutting project helpers and wrappers for external services.
- `src/env.ts` owns runtime environment validation.

Cross-cutting services live behind project-owned helpers in `src/lib/`, including Better Auth, AI providers, email, media storage, and rate limiting.

The rich-text editor and read-only renderer (`src/components/shared/tiptap-editor.tsx` and `tiptap-renderer.tsx`) share their Tiptap extension sets through `src/lib/editor/build*Extensions()` helpers (tables, math). Both surfaces must register the same extensions: Tiptap drops unknown nodes when parsing stored HTML, so math or tables present only in the editor would vanish in the renderer. Math nodes (KaTeX) serialize their LaTeX into a `data-latex` attribute, which `src/lib/editor/rich-text.ts` surfaces as text so equations stay searchable and within length limits.

## Enforced Boundaries

Two boundaries above are machine-checked, not just convention (see the Automated Guards section in [AGENTS.md](../AGENTS.md)):

- Server Actions (`src/app/actions/*`) cannot import `@/db/index`; they go through `src/features/*`. Enforced by a `noRestrictedImports` override in `biome.json`.
- Components (`src/components/*`) cannot import `@/features/*/mutations`; writes flow through Server Actions. Enforced by the same rule. Server Components reading from `queries.ts` live under `src/app/*`, so they are unaffected.

A separate guard, `bun run check:size`, keeps files under 500 lines.
