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
  narrow per content via `maxWidth` (`3xl` flashcard/admin). Width is the only thing a detail page tunes — structure is fixed.
- **Document workspaces** (note, mindmap) stay full-width (`max-w-7xl`) and own their layout for zen mode.
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
  (flashcards, subjects).

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

## Z-index layers

Stacking uses four named layers, defined once as `--z-index-*` theme tokens in
`src/app/globals.css`. Use the named utility; numeric (`z-10`, `z-120`) and
arbitrary (`z-[60]`, `z-(--x)`) z-index classes are rejected outside
`src/components/ui/` by `src/app/z-index-layers.test.ts`.

| Utility | Value | Use for |
| --- | --- | --- |
| `z-raised` | 10 | In-flow content lifted over its siblings: sticky table headers, editor handles |
| `z-chrome` | 30 | Sticky app chrome: page top bar, mobile header, the study assistant launcher and global sidebar |
| `z-immersive` | 35 | Note/mindmap zen mode (`fixed inset-0`) |
| `z-overlay` | 50 | Everything that floats or blocks the page: dialogs, sheets, menus, popovers, selects, tooltips, and full-screen review surfaces |

Toasts (Sonner) manage their own z-index above all layers.

### The overlay rule: one layer, ordered by opening

Overlay surfaces never compete on z-index. They all sit on `z-overlay` (the
`z-50` that shadcn primitives hardcode), and Radix portals append each surface
to the end of `<body>` when it opens, so **whichever opened last paints on
top**. This is what lets the command palette (`Ctrl+P`), shortcuts help (`?`),
create dialogs, and review edit/delete/reset dialogs all appear over a review
session without per-dialog configuration.

Rules that keep it working:

- Never give a dialog, menu, or full-screen surface a higher z-index to "win".
  If something renders behind an overlay, it is opening in the wrong order or
  outside a portal; fix that instead. Do not add `className`/`overlayClassName`
  props to dialogs just to change their layer.
- Full-screen surfaces that sit above the app shell (review sessions) render
  through a portal (`ReviewScrollBoundary`) on `z-overlay`, so they share the
  dialog ordering.
- A surface opened *from* a dialog closes that dialog first; the dialog would
  otherwise sit underneath the newer surface.
- Keep `z-immersive` below `z-overlay` so menus, dialogs, and toasts stay above
  zen mode without portal retargeting. Zen mode is a CSS overlay, **not** the
  browser Fullscreen API.
- Third-party internals (for example React Flow's edge-label layer) may set a
  raw `z-index` in `globals.css` scoped to that library's container; that
  stacking stays local to the library's own stacking context.
- A new layer needs a real new tier of UI, a token in `globals.css`, a row in
  this table, and an entry in `src/app/z-index-layers.test.ts`. It is never the fix
  for one component rendering behind another.

Full-screen review surfaces use `ReviewScrollBoundary` for portal placement and
background scroll isolation, including nested dialogs. Keep card scrolling inside
the session's `min-h-0 flex-1 overflow-y-auto` region.

## Transitions

Prefer the narrowest transition: `transition-colors` for hover/focus,
`transition-opacity`/`transition-transform` for motion. `transition-all` is only
acceptable for width-animated progress bars and inside shadcn primitives (which
are not hand-edited).

Enter animations use `tw-animate-css` (`animate-in fade-in …`) behind the
`motion-safe:` variant so reduced-motion users get instant changes. Keep them
at 200ms or less where users act repeatedly: review sessions fade each new card
in (keyed by card id) and fade/slide the revealed answer in.

## Study assistant and inline review

The assistant is one global collapsible right sidebar. At desktop widths (`lg`)
the app shell and review surface reserve `w-96`; on mobile it covers the page
and its minimize control returns to the current task. Flashcard dialogs use one
viewport-sized modal focus boundary containing the centered editor and a portal
host for the same assistant. Review provides its own host inside its scroll
boundary. Nested hosts restore the previous host on close; never raise z-index
to expose chat above a dialog.

AI edits are reviewed inside each affected input, with separate Accept and
Discard controls per field. Additions use success intent variables; deletions
use danger intent variables and strikethrough. Read-only review decorations
never become editor content. Resolve proposals before saving; the unchanged
fields remain editable.
