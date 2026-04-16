# Project Simplification Audit

## Summary

This audit focuses on shrinking Notorium through cleanup and simplification without removing supported product features. The repo is not broadly chaotic; it is concentrated around a few high-cost subsystems that dominate maintenance:

- Flashcards, review, exam mode, scheduling, and AI are the main complexity center. The repo contains 26 review/exam/FSRS-related files and 18 AI-related files.
- Rich-text image handling and private attachment storage are a second large complexity center. The repo contains 18 attachment / image / editor storage related files and cross-cuts notes, flashcards, account deletion, and API routes.
- Email notifications are a smaller but infrastructure-heavy feature. They add env requirements, account preferences, API routes, email provider code, tests, and docs.
- There are a handful of concrete dead-code candidates and at least one compatibility-only route wrapper that can be removed with high confidence.

The largest safe simplification wins will come from:

- removing proven dead modules
- removing compatibility-only wrappers
- reducing abstraction overhead inside the heaviest retained subsystems

## Evidence-Backed Dead Code / Orphaned Files

These items had no import references from app or test code during the repo scan. They are the safest cleanup candidates in this audit.

### High-confidence dead files

- [src/components/decks/decks-list.tsx](/home/user/workspace/notorium/src/components/decks/decks-list.tsx)
  - No import references were found.
  - This appears to be an older deck-management surface superseded by the canonical `/flashcards` deck tree/sidebar flow described in `SPEC.md` and implemented around [src/components/decks/deck-tree-sidebar.tsx](/home/user/workspace/notorium/src/components/decks/deck-tree-sidebar.tsx) and [src/app/(app)/flashcards/page.tsx](/home/user/workspace/notorium/src/app/(app)/flashcards/page.tsx).
  - Recommendation: remove.

- [src/components/flashcards/shared/flashcards-statistics-filters.tsx](/home/user/workspace/notorium/src/components/flashcards/shared/flashcards-statistics-filters.tsx)
  - No import references were found.
  - Statistics filtering is already handled through the broader flashcards workspace and page state flow.
  - Recommendation: remove.

- [src/components/shared/subject-select.tsx](/home/user/workspace/notorium/src/components/shared/subject-select.tsx)
  - No import references were found.
  - This is a generic control with no active callers.
  - Recommendation: remove.

- [src/components/subjects/grades-summary.tsx](/home/user/workspace/notorium/src/components/subjects/grades-summary.tsx)
  - No import references were found.
  - The active product shape is the planning page plus minimal subject assessment summaries, not a standalone reusable grades summary surface.
  - Recommendation: remove unless there is an unmerged caller outside the current tree.

- [src/lib/auth/auth-client.ts](/home/user/workspace/notorium/src/lib/auth/auth-client.ts)
  - No import references were found.
  - `AGENTS.md` says this should be the client auth entry when needed, but the current app does not use it.
  - Recommendation: remove if the project is committed to server-heavy auth flows; otherwise keep only if there is an explicit near-term client auth need.

### Notes on confidence

- Confidence is high for the files above because they are ordinary modules/components and not file-routed entrypoints.
- File-routed modules such as [src/api/auth/[...all]/route.ts](/home/user/workspace/notorium/src/api/auth/[...all]/route.ts) must not be treated as dead code just because they are unimported.

## Compatibility Shims and Duplicate Paths

### Confirmed compatibility-only wrapper

- [src/app/(app)/subjects/[id]/flashcards/[flashcardId]/page.tsx](/home/user/workspace/notorium/src/app/(app)/subjects/%5Bid%5D/flashcards/%5BflashcardId%5D/page.tsx)
  - This file is redirect-only and forwards to `/flashcards/[flashcardId]`.
  - The current product spec explicitly states that the canonical route is the flat flashcard detail page.
  - Recommendation: remove once callers are confirmed migrated. This is a low-risk cleanup with clear intent.

### Active canonical detail routes

- [src/app/(app)/flashcards/[flashcardId]/page.tsx](/home/user/workspace/notorium/src/app/(app)/flashcards/%5BflashcardId%5D/page.tsx)
  - Active canonical flashcard detail route.

- [src/app/(app)/subjects/[id]/notes/[noteId]/page.tsx](/home/user/workspace/notorium/src/app/(app)/subjects/%5Bid%5D/notes/%5BnoteId%5D/page.tsx)
  - Still part of the current product shape.
  - Not dead code.

- [src/app/(app)/assessments/[assessmentId]/page.tsx](/home/user/workspace/notorium/src/app/(app)/assessments/%5BassessmentId%5D/page.tsx)
  - Active canonical assessment detail route.

### Back-link and origin context complexity

- [src/lib/navigation/detail-page-back-link.ts](/home/user/workspace/notorium/src/lib/navigation/detail-page-back-link.ts)
  - This helper is active, but part of its complexity exists to support multiple return origins and cross-surface navigation context.
  - It is justified today, but it should be simplified if compatibility routes or alternate entry contexts are removed.
  - Recommendation: keep for now, then trim after route consolidation.

## Cleanup and Consistency Opportunities

### Manual memoization exception in a React Compiler repo

- [src/components/shared/deck-select.tsx](/home/user/workspace/notorium/src/components/shared/deck-select.tsx)
  - Uses `useMemo` for `selectedDeck` and `filteredDecks`.
  - Repo guidance says manual memoization should be exceptional.
  - Recommendation: review whether simple inline computation is sufficient. This is not a large payoff item, but it is a consistency cleanup.

### Over-fragmented flashcards UI

- The flashcards area has a high number of wrapper, loading, dialog, manage, statistics, and review components.
- Not all of this is bad, but the flashcards subsystem is clearly the densest abstraction cluster in the repo.
- Recommendation: collapse thin wrappers and remove single-purpose indirection that no longer earns its keep while preserving the current feature set.

### Internal simplification targets for retained features

These features stay. The opportunity is implementation cleanup, not product removal.

- AI flashcard generation and validation
  - Keep feature behavior.
  - Simplify provider plumbing, prompt/helper sprawl, and overlapping AI-specific utility layers.

- Pasted-image attachments and private media storage
  - Keep feature behavior.
  - Simplify duplicated cleanup paths, ownership checks, and editor-side helper coordination.

- Exam mode and regular review
  - Keep both flows.
  - Simplify branch-heavy state handling in [src/components/flashcards/review/flashcard-review-client.tsx](/home/user/workspace/notorium/src/components/flashcards/review/flashcard-review-client.tsx) and reduce coupling to exam-only session logic.

- Email assessment notifications
  - Keep feature behavior.
  - Simplify the boundaries between account preferences, delivery orchestration, and notification logging so the feature remains isolated.

### Unused imports

- This audit intentionally does not claim a definitive unused-import list from grep alone.
- Recommendation: after dead-file removal, run the project’s normal lint/typecheck workflow and treat the remaining unused imports as a cheap second-pass cleanup.

## Prioritized Roadmap

### Phase 1: Safe deletions

Risk: low

- Remove proven dead files:
  - [src/components/decks/decks-list.tsx](/home/user/workspace/notorium/src/components/decks/decks-list.tsx)
  - [src/components/flashcards/shared/flashcards-statistics-filters.tsx](/home/user/workspace/notorium/src/components/flashcards/shared/flashcards-statistics-filters.tsx)
  - [src/components/shared/subject-select.tsx](/home/user/workspace/notorium/src/components/shared/subject-select.tsx)
  - [src/components/subjects/grades-summary.tsx](/home/user/workspace/notorium/src/components/subjects/grades-summary.tsx)
  - [src/lib/auth/auth-client.ts](/home/user/workspace/notorium/src/lib/auth/auth-client.ts)
- Remove the redirect-only compatibility route:
  - [src/app/(app)/subjects/[id]/flashcards/[flashcardId]/page.tsx](/home/user/workspace/notorium/src/app/(app)/subjects/%5Bid%5D/flashcards/%5BflashcardId%5D/page.tsx)

Expected impact:

- Small code reduction, immediate clarity gains, less false surface area.

### Phase 2: Mechanical cleanup pass

Risk: low

- Run normal lint/typecheck outside this audit.
- Remove residual unused imports, dead symbols, and stale tests exposed by Phase 1.
- Review [src/components/shared/deck-select.tsx](/home/user/workspace/notorium/src/components/shared/deck-select.tsx) for `useMemo` removal.

Expected impact:

- Low drama cleanup, better signal-to-noise.

### Phase 3: Internal refactors of heavy subsystems

Risk: medium

Focus areas:

1. Flashcards review/exam client structure
2. Attachments and editor cleanup flow
3. AI provider/helper consolidation
4. Notifications isolation and boundary cleanup

Expected impact:

- Preserves the current product while reducing maintenance burden in the most complex subsystems.

### Phase 4: Post-refactor consolidation

Risk: medium

- After internal refactors land, collapse wrapper layers and simplify navigation/context helpers.
- Especially revisit:
  - flashcards review/manage/statistics split
  - attachment cleanup helpers
  - back-link origin handling

Expected impact:

- Converts feature removal into real architectural simplification instead of leaving hollow abstractions behind.

## Defaults and Assumptions

- This report distinguishes proof from inference.
- “Dead code” claims are limited to modules with no callers found in the current tree and excludes file-routed entrypoints.
- Retained features should be simplified internally, not targeted for removal.
- The best immediate cleanup value is safe deletion first, then mechanical cleanup and focused refactors in the heaviest subsystems.
