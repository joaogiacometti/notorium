# Independent Deck System

## Context

- Flashcards are deck-bound and no longer subject-bound.
- Deck hierarchy is modeled with `parentDeckId`.
- Deck paths use computed `::` notation for display and searchable picking.
- The canonical flashcard detail route is `/flashcards/[flashcardId]`.
- The `/flashcards` page is the canonical deck management surface.

## Already Complete

- `deck` and `flashcard` schema use independent deck ownership in [src/db/schema.ts](/home/user/workspace/notorium-private/src/db/schema.ts).
- Deck CRUD, move validation, and deck/user limits exist in [src/features/decks](/home/user/workspace/notorium-private/src/features/decks) and [src/lib/config/limits.ts](/home/user/workspace/notorium-private/src/lib/config/limits.ts).
- Flashcard mutations require `deckId` and enforce per-deck limits in [src/features/flashcards/mutations.ts](/home/user/workspace/notorium-private/src/features/flashcards/mutations.ts).
- Subject creation no longer creates a default deck in [src/features/subjects/mutations.ts](/home/user/workspace/notorium-private/src/features/subjects/mutations.ts).
- Import/export already models standalone decks in [src/features/data-transfer](/home/user/workspace/notorium-private/src/features/data-transfer).
- The flat flashcard detail route exists in [src/app/(app)/flashcards/[flashcardId]/page.tsx](/home/user/workspace/notorium-private/src/app/(app)/flashcards/[flashcardId]/page.tsx).

## Implemented In This Pass

- Recursive deck scoping now applies to flashcard manage, review, exam, and statistics queries.
- Read models now return real `deckPath` values instead of flattening to `deck.name`.
- Flashcard search results display deck paths.
- `/flashcards` now renders a deck tree sidebar with create, rename, and delete actions.
- Flashcard create, edit, and bulk-move deck pickers now support path-based searching.
- Manage tables and detail surfaces now show deck paths.

## Remaining Follow-up

- Add a dedicated move-deck UI if deck re-parenting should be exposed in the sidebar.
- Expand automated coverage for recursive deck filtering and path display.
- Remove the legacy subject-scoped flashcard redirect route once no callers remain.
