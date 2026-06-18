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
|-- components/          Feature UI, shared UI, the left menu (components/navbar), auth forms, and shadcn primitives
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
- Library (`src/features/library/`) is a top-level, `userId`-scoped feature for uploading PDF books and tracking reading position. Books store file metadata plus `currentPage`/`totalPages` on a single `library_book` row (one user : one book : one progress, so no separate progress table). Uploads reuse the media-storage stack: base64 travels through the `uploadBook` Server Action (`src/app/actions/library.ts`) to `mutations.ts`, which decodes via the shared `src/lib/media-storage/decode-base64.ts`, stores the file under the `"library"` upload context, and rolls back the blob if the DB insert fails. The PDF is served back through the ownership-checked route `src/app/api/library/[id]/route.ts` (inline `content-disposition`). The reader is built on EmbedPDF (`@embedpdf/*`), whose pdfium WebAssembly engine renders pages and powers the zoom/spread/fullscreen/thumbnail/bookmark plugins, with the selection plugin adding a selectable text layer over each page. Because the engine is browser-only WASM, `book-reader.tsx` loads the implementation through `next/dynamic` with `ssr: false`; `book-reader-surface.tsx` initializes the engine (`usePdfiumEngine`) and registers plugins inside the `EmbedPDF` provider, `book-reader-layout.tsx` composes the toolbar, sidebar, and scrolling viewport, and `book-reader-toolbar.tsx`/`book-reader-sidebar.tsx` drive the controls. The sidebar's Pages/Content switch renders either `book-reader-thumbnails.tsx` (the virtualized page rail) or `book-reader-outline.tsx` (the bookmark plugin's table of contents); LINK annotations jump through the shared `use-reader-navigate-target.ts` hook, which drives the annotation plugin's navigator (smooth scroll, precise in-page position) and records reader back-history; outline entries instead scroll to the destination page directly with `behavior: "instant"` (the navigator has no instant option) and fall back to that shared hook only for external URI targets. `use-reading-position.ts` owns the page-save logic, reading the scroll plugin's `currentPage` (debounced + deduped saves via `updateReadingPage`, restore-before-save guard, and a visibilitychange/unmount flush). `updateReadingPage` deliberately does not `revalidatePath` since it fires on every scroll. The pdfium WASM loads from a version-pinned jsDelivr CDN by default (override via `usePdfiumEngine({ wasmUrl })`); `next.config.ts` raises `serverActions.bodySizeLimit` to fit base64-encoded PDFs.
- Notes and mindmaps are both subject-scoped and surfaced together in a subject's "Documents" area under `src/app/(app)/subjects/[id]/documents/` (`documents/notes/[noteId]/`, `documents/mindmaps/[mindmapId]/`). Document navigation comes from the global subject tree sidebar; the subject page itself is a browsable overview of one subject — a full-path breadcrumb, its direct subfolders as cards (`src/components/subjects/subject-subfolder-grid.tsx`, fed by `findSubjectTreeNode` over `getSubjectTreeForUser` so card counts match the sidebar), and the subject's complete document list (`src/components/documents/documents-list.tsx`, no preview cap), with academic root summaries on top. `src/features/documents/` is a thin read layer that merges `src/features/notes` and `src/features/mindmaps` results into one recency-ordered list (`DocumentListItem`) for the subject page. Note and mindmap detail pages do not render an in-page sidebar — document navigation comes from the global subject tree sidebar — so their editor/canvas spans the full content width. The per-document kebab (Edit/Delete/Generate/Copy/Export) is shared via `src/components/documents/document-row-menu.tsx` (the menu) and `use-document-row-dialogs.tsx` (a hook owning the dialog state + note copy, returning the row handlers and the dialog JSX); the tree sidebar (`src/components/subjects/tree/`) consumes it. Because the tree lives in the app shell, the authenticated layout (`src/app/(app)/layout.tsx`) loads decks once and threads them with `aiEnabled` down to the tree so the "Generate flashcards" action works from any page.
- Mindmaps (`src/features/mindmaps/`) are scoped by `userId` and `subjectId` (mirroring notes). The free-form canvas uses React Flow (`@xyflow/react`), loaded client-side, and persists its node/edge graph as JSON in the `mindmap.data` column.
- The authenticated shell (`src/components/shared/app-layout-client.tsx`) renders the collapsible left menu (`src/components/navbar/`) beside the page content; there is no top navbar. Pages render a sticky breadcrumb top bar via `src/components/shared/page-top-bar.tsx` (`PageTopBar` and the matching `PageTopBarSkeleton` for `loading.tsx`), which is the location indicator and replaces per-page back links. Card/detail pages center their content with `AppPageContainer`/`DetailPageLayout` at `max-w-5xl`; document workspaces (documents list, note, mindmap) stay full-width (`max-w-7xl`). The root route (`src/app/(app)/page.tsx`) is the Home dashboard rendered inside the authenticated shell; it self-gates with `requireSession()` (signed-out users go to `/login`) and composes overview cards from existing feature queries (flashcards due, upcoming assessments, recent documents across subjects, subjects grid).
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
