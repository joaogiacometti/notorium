# Design System

The single source of truth for Notorium's visual/interaction standards. When two
surfaces share a role, they must share these tokens. New UI picks the matching
role here instead of inventing a one-off class string.

Audience: agents and contributors building or changing UI.

Related docs: [Architecture](./docs/architecture.md), [Agent Guide](./AGENTS.md)

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
| Detail/card page frame | `DetailPageLayout` (`src/components/shared/detail-page-layout.tsx`) | repeating `PageTopBar` + `AppPageContainer` |
| Feature list/index page frame | `FeaturePageShell` | — |

A raw `<button>` is correct only for genuinely custom controls (canvas tools,
graph nodes, segmented toggles, drop zones), not for standard actions.

## Page frames

- **Card/detail pages** compose `DetailPageLayout` (sticky `PageTopBar`
  breadcrumb over a centered `AppPageContainer`). Default width `max-w-5xl`;
  narrow per content via `maxWidth` (`3xl` admin; flashcard detail uses `7xl` to match documents, with Front/Back side by side). Width is the only thing a detail page tunes — structure is fixed.
- **Document workspaces** (note, mindmap) stay full-width (`max-w-7xl`) and own their layout for zen mode.
- Every `page.tsx` has a sibling `loading.tsx` that mirrors its layout and the
  `PageTopBar` (`PageTopBarSkeleton`).

## Spacing

Spacing uses Tailwind's 4px scale. Pick the role below; do not invent
in-between values (`gap-5`, `mb-7`) for a role that already has one.

| Role | Token | Notes |
| --- | --- | --- |
| Page frame | `AppPageContainer` (`px-4 sm:px-6 lg:px-8`, `pt-6 pb-8`) | Never re-pad a page body by hand |
| Dialog frame | `DialogContent` default `p-6 gap-4`; scrolling editor dialogs use `px-4 sm:px-6` with `pt-5 sm:pt-6` header and `py-4` footer | Footer actions sit below a `border-t` |
| Page/detail header → body | `16px` (`mb-4` / `gap-4`) | Note, mindmap, and flashcard detail share it |
| Between form fields | `16px` (`FieldGroup className="gap-4"`, or `space-y-4`) | Auth pages may widen to `md:gap-6` |
| Label → control | `Field` primitive (`gap-3`) | Label rows with optional inline buttons use `min-h-6` so labels with and without buttons align |
| Title → header metadata | `4px` (`gap-1`) | See [Header metadata](#header-metadata) |
| Inline icon + text | `gap-1` (`text-xs`), `gap-1.5`–`gap-2` (`text-sm`+) | |
| Header action buttons | `size-10` icon buttons, `gap-2` between them | Same on note, mindmap, and flashcard detail |

Editable fields use `Field` + `FieldLabel` (title case) everywhere, including
autosaving detail pages, so a card looks the same in its page and its dialog.
Uppercase section labels are for read-only sections (review card faces,
dashboard groups), not form inputs.

## Surfaces (elevation tiers)

Two intentional tiers — do not blur them:

- **Elevated card** — the shadcn `Card` primitive (`border bg-card shadow-sm`).
  For dashboard/home cards and stat tiles that should lift off the page. Home
  overview cards share `DashboardCardHeader`
  (`src/components/home/dashboard-card-header.tsx`): a leading muted `size-4`
  domain icon, a `text-base` title, and an optional right-aligned action.
- **Flat panel** — `rounded-xl border border-border/70 bg-card/85`. For content
  panels, tables, and detail sections. This is the app-wide panel surface
  (such as flashcard management).

## Typography roles

| Role | Token |
| --- | --- |
| Page / primary heading | `text-2xl font-bold tracking-tight` |
| Section heading | `text-lg font-semibold tracking-tight` |
| Uppercase section label (read-only sections) | `text-xs font-semibold uppercase tracking-wide text-muted-foreground` |
| Table micro-label | `text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground` |

## Header metadata

Record metadata (subject, provenance such as a flashcard's source) sits in the
header as muted `text-xs` text, beside or under what it describes, never as a
chip, badge, or form-row control. Links in it size to their content (`w-fit`)
so the click target is only the text, and open a new tab from dialogs and
review sessions so drafts and progress survive. Detail headers do not show
created/updated timestamps; recency belongs in lists (for example the home
recent-documents card) where it helps sort or scan. The flashcard example is
`FlashcardSourceReference`
(`src/components/flashcards/shared/flashcard-source-reference.tsx`).

## Dashed-border roles

`border-dashed` carries three distinct meanings — keep them visually distinct:

- **Static empty state** — `border-border/60`, muted fill (`bg-muted/20`), `text-center`,
  not interactive. Reuse these surface tokens at the appropriate padding; the
  subject tree example is `src/components/subjects/tree/subject-tree-empty-state.tsx`.
- **Interactive add affordance** — `border-border/50` + `transition-colors` + a
  `hover:` border/text change. It is a button.
- **Drag-drop target** — primary-tinted dashed border, toggled on drag-over.

## Color & tone

- All UI colors are CSS variables (`globals.css`); never hardcoded Tailwind color
  classes (`bg-red-500`, etc.). See the styling rules in [AGENTS.md](./AGENTS.md).
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

AI flashcard edits are reviewed inside each affected input, with separate Accept and
Discard controls per field. Additions use success intent variables; deletions
use danger intent variables and strikethrough. Read-only review decorations
never become editor content. Resolve proposals before saving; the unchanged
fields remain editable.

Note and mindmap AI proposals preview in the document region, not in chat. A
bordered `DocumentEditReviewControls` bar (Added / Removed legend, one Discard
changes / Accept changes pair) resolves the entire proposal. Notes show a
read-only preview in place of the editor, using danger intent strikethrough for
removals and success intent text for additions; a title change shows the
struck original beside the suggestion. Preview content never enters the live
document; Accept uses normal autosave and existing undo. The chat keeps only a
muted one-line outcome per proposal and opens no overlay.

Mindmap review nodes keep the plain
node box (`w-48`, theme color tint, bold/italic) with a dashed success or danger
border, and their state badge sits on the top border so it never adds height.
Only cross-connection edges carry a text badge; tree-edge changes show on the
child node.
