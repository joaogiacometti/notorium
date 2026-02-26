# Notorium — Roadmap

## How This File Works
- This file tracks future and in-progress features.
- Keep items atomic so agents can implement one item per change.
- Use statuses consistently: `planned`, `in_progress`, `done`, `dropped`.
- When an item ships:
  - Set status to `done`.
  - Update `SPEC.md` only if current behavior/constraints changed.

## Prioritization
- `P0`: critical correctness, security, or production blockers.
- `P1`: high-value product features.
- `P2`: useful improvements and scale/performance upgrades.
- `P3`: nice-to-have polish.

## Roadmap Items

| ID | Feature | Priority | Status | Why |
| --- | --- | --- | --- | --- |
| R-001 | Assessments Refactor Phase 1: Subject Overview Simplification | P1 | done | Reduce cognitive load on subject page by keeping assessments high-level. |
| R-002 | Assessments Refactor Phase 2: Global Assessments Insights Page | P1 | done | Move detailed assessment analysis to a single cross-subject page with filtering tools. |

### R-001 — Assessments Refactor Phase 1: Subject Overview Simplification
- Priority: P1
- Status: done
- Why: The current subject page should prioritize clarity and quick status checks over dense assessment management.
- Scope in:
  - Refactor assessments section in `/subjects/[id]` to show only general information.
  - Keep high-level metrics only (for example: total assessments, pending count, overdue count, overall average).
  - Add a clear entry point to the dedicated assessments page for deeper analysis.
- Scope out:
  - Advanced filtering and sorting controls on `/subjects/[id]`.
  - Detailed historical breakdowns or charts.
- Acceptance criteria:
  - `/subjects/[id]` displays a concise, general assessments summary.
  - User can navigate from `/subjects/[id]` to the dedicated assessments view in one click.
  - Existing create/edit/delete assessment flows continue working without behavioral regressions.
- Dependencies:
  - None.

### R-002 — Assessments Refactor Phase 2: Global Assessments Insights Page
- Priority: P1
- Status: done
- Why: Assessment-heavy workflows need one focused cross-subject view with filters and richer visualization than the subject overview should provide.
- Scope in:
  - Create a dedicated route for full assessment visualization across all subjects (`/assessments`).
  - Add filtering controls (at minimum: status, type, due date window).
  - Add sorting controls (for example: due date, score, created date).
  - Show detailed assessment list and summary blocks that react to active filters.
- Scope out:
  - Cross-subject analytics dashboard.
  - Predictive grading or AI recommendations.
- Acceptance criteria:
  - The new page can be opened from `/subjects/[id]`.
  - Filters update the displayed results correctly and remain scoped to the current user across all of their subjects.
  - Empty states are clear when no assessments match active filters.
  - Page works on mobile and desktop breakpoints.
- Dependencies:
  - R-001

## Item Template

Copy this block for new items:

```md
### R-XXX — Feature Title
- Priority: P1
- Status: planned
- Why: One sentence on product value.
- Scope in:
  - ...
- Scope out:
  - ...
- Acceptance criteria:
  - ...
- Dependencies:
  - ...
```
