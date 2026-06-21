# UI Conventions

The single source of truth for Notorium's visual/interaction standards. When two
surfaces share a role, they must share these tokens. New UI picks the matching
role here instead of inventing a one-off class string.

Audience: agents and contributors building or changing UI.

Related docs: [Architecture](./architecture.md), [Agent Guide](../AGENTS.md)

## Primitives first

Never hand-roll what a primitive already owns. Adoption is enforced by review,
and bypassing a primitive is the most common source of drift.

| Need | Use | Never |
| --- | --- | --- |
| Dialog / modal | `@/components/ui/dialog`, `sheet` | raw `@radix-ui/react-dialog` |
| Tooltip / popover | `@/components/ui/tooltip`, `popover` | raw Radix |
| Form field | `@/components/ui/field` + `input`/`textarea`/`select` | raw `<input>` with ad-hoc classes |
| Button / action | `@/components/ui/button` variants | styled `<button>` for standard actions |
| Status pill | `StatusToneBadge` (`src/components/shared/status-tone-badge.tsx`) | hand-rolled `rounded-full border` pill |
| Full-page empty state | `EmptyState` (`src/components/shared/empty-state.tsx`) | re-building the icon medallion + title + body |
| Detail/card page frame | `DetailPageLayout` (`src/components/shared/detail-page-layout.tsx`) | repeating `PageTopBar` + `AppPageContainer` |
| Feature list/index page frame | `FeaturePageShell` | — |

A raw `<button>` is correct only for genuinely custom controls (canvas tools,
graph nodes, segmented toggles, drop zones), not for standard actions.

## Page frames

- **Card/detail pages** compose `DetailPageLayout` (sticky `PageTopBar`
  breadcrumb over a centered `AppPageContainer`). Default width `max-w-5xl`;
  narrow per content via `maxWidth` (`3xl` flashcard/admin, `4xl` assessment,
  `5xl` subject). Width is the only thing a detail page tunes — structure is fixed.
- **Document workspaces** (documents list, note, mindmap, book reader) stay
  full-width (`max-w-7xl`) and own their layout for zen/embedded modes.
- Every `page.tsx` has a sibling `loading.tsx` that mirrors its layout and the
  `PageTopBar` (`PageTopBarSkeleton`).

## Surfaces (elevation tiers)

Two intentional tiers — do not blur them:

- **Elevated card** — the shadcn `Card` primitive (`border bg-card shadow-sm`).
  For dashboard/home cards and stat tiles that should lift off the page. Home
  overview cards share `DashboardCardHeader`
  (`src/components/home/dashboard-card-header.tsx`): a leading muted `size-4`
  domain icon, a `text-base` title, and an optional right-aligned action.
- **Flat panel** — `rounded-xl border border-border/70 bg-card/85`. For content
  panels, tables, and detail sections. This is the app-wide panel surface
  (flashcards, planning, calendar, subjects, assessments).

## Typography roles

| Role | Token |
| --- | --- |
| Page / primary heading | `text-2xl font-bold tracking-tight` |
| Section heading | `text-lg font-semibold tracking-tight` |
| Uppercase section label | `text-xs font-semibold uppercase tracking-wide text-muted-foreground` |
| Table micro-label | `text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground` |

## Dashed-border roles

`border-dashed` carries three distinct meanings — keep them visually distinct:

- **Static empty state** — `border-border/60`, muted fill (`bg-muted/20`), `text-center`,
  not interactive. Full-page variants use the `EmptyState` component; inline
  variants reuse the same surface token at smaller padding.
- **Interactive add affordance** — `border-border/50` + `transition-colors` + a
  `hover:` border/text change. It is a button.
- **Drag-drop target** — primary-tinted dashed border, toggled on drag-over.

## Color & tone

- All UI colors are CSS variables (`globals.css`); never hardcoded Tailwind color
  classes (`bg-red-500`, etc.). See the styling rules in [AGENTS.md](../AGENTS.md).
- Status colors flow through `getStatusToneClasses(tone)` / `StatusToneBadge`
  (`src/lib/ui/status-tones.ts`), never bespoke per-status hex/utility maps.

## Z-index ladder

Bare-number Tailwind v4 values (no `z-[n]` brackets). Layers, low → high:

| Layer | `z-` |
| --- | --- |
| Sticky table/section headers | `10` |
| Sticky page top bar | `30` |
| Floating window overlay | `40` |
| Window dock | `45` |
| Dialogs, zen-mode editors | `50` |
| Full-screen review surfaces | `110` |
| Dialogs above review surfaces | `120` |

## Transitions

Prefer the narrowest transition: `transition-colors` for hover/focus,
`transition-opacity`/`transition-transform` for motion. `transition-all` is only
acceptable for width-animated progress bars and inside shadcn primitives (which
are not hand-edited).
