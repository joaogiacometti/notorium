# Design System

Read this before changing UI. These are shared design decisions, not a feature
specification. Components own their exact markup and defaults;
[theme tokens](./src/app/globals.css) own color, radius, shadow, and layer values.
Update this file when a shared convention changes, not whenever a control changes.

## Primitives first

Reuse existing components rather than rebuilding their appearance or behavior.
Do not hand-edit `src/components/ui/`; compose its primitives.

| Need | Use |
| --- | --- |
| Dialog, sheet, tooltip, popover | Matching `src/components/ui/` primitive, not raw Radix |
| Editable field | `Field` + `FieldLabel` + input, textarea, or select primitive |
| Standard action | `Button`; `AsyncButtonContent` for pending content |
| Status pill | `StatusToneBadge` |
| Page title and actions | `PageHeader` |
| Detail page | `DetailPageLayout` |
| Feature index | `FeaturePageShell` |
| Home card header | `DashboardCardHeader` |

Page components live in [shared components](./src/components/shared/). Raw buttons
are for custom controls such as segmented toggles and drop zones, not ordinary actions.

## Page frames and spacing

- Detail pages use `DetailPageLayout`: sticky breadcrumb above `AppPageContainer`.
  Choose its supported width instead of rebuilding the frame or adding body padding.
- Note workspaces own their full-width layout for zen mode. Review/exam sessions
  are in-flow pages with the sidebar hidden, not modal overlays or scroll locks.
- When changing a page or header, update its matching `loading.tsx` and
  `PageTopBarSkeleton` so loading and loaded layouts agree.
- Use the spacing roles below instead of near-matching one-off values. Container
  and dialog components own their frame padding; scrolling editor dialogs keep
  header/body/footer separate, with a border above footer actions.

| Role | Convention |
| --- | --- |
| Header → body; between form fields | `gap-4`, `mb-4`, or `space-y-4` |
| Label → control | `Field` defaults; label rows with inline actions use `min-h-6` |
| Title → metadata | `gap-1` |
| Inline icon + text | `gap-1` for `text-xs`; `gap-1.5`–`gap-2` for larger text |
| Detail header actions | `size-10` icon buttons with `gap-2` |

Editable labels use title case. Flashcard Front/Back labels stay uppercase across
read and edit surfaces; other uppercase labels identify read-only sections.

## Surfaces, color, and type

Keep the UI flat: no decorative gradients, shadows, or nested bordered panels.
Use `Card` for panels, plain `border-border`, and theme radius defaults: controls
use `rounded-md`, panels/dialogs `rounded-lg`. Reserve `rounded-full` for avatars
and status dots. Floating surfaces may use `shadow-md` and above.

Use semantic theme colors, not hardcoded palette classes or per-component hex
values. Hover fill is `bg-muted/50`; selected fill is `bg-muted`. Primary marks
the main action, focus, and selection. Intent colors communicate status through
[status tones](./src/lib/ui/status-tones.ts), not bespoke per-status maps.

| Text role | Convention |
| --- | --- |
| Page/detail title | `text-xl font-semibold tracking-tight` |
| Section heading | `text-base font-semibold tracking-tight` |
| Read-only section label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Record metadata | Muted `text-xs`, beside or beneath the title |

Metadata is text, not a badge or form control. Its links size to their text and
open a new tab from dialogs/review sessions to preserve drafts and progress.
Keep created/updated timestamps in lists, not detail headers.

Dashed borders distinguish three roles:

- Static empty state: `border-border bg-muted/20 text-center`, non-interactive.
- Add action: `border-border/50` with hover border/text feedback, rendered as a button.
- Drop target: primary-tinted border activated by drag-over.

## Z-index layers

Use named layers from `globals.css`; [the layer test](./src/app/z-index-layers.test.ts)
guards against numeric/arbitrary utilities outside shadcn primitives.

| Utility | Role |
| --- | --- |
| `z-raised` | Content above siblings, such as sticky table headers |
| `z-chrome` | Sticky page bars, mobile header, global sidebar |
| `z-immersive` | Note/PDF zen mode |
| `z-overlay` | Dialogs, sheets, menus, popovers, selects, tooltips |

Overlays share one layer and stack by portal DOM order. Fix the portal host or
opening order when something is hidden; do not raise a component's z-index to win.
Navigation from a dialog to another surface closes the originating dialog first;
controls belonging to that dialog remain within its focus boundary.

Zen mode is a CSS overlay, not the browser Fullscreen API. Toasts manage their own
layer. Third-party internals may use scoped raw z-index values within their own
stacking context. Add a layer only for a genuinely new UI tier, updating the theme,
this table, and the layer test together.

## Reading and editing

- **PDFs:** on phones, use the full workspace width and one bottom reading bar
  that reserves the safe area without covering content. Account for breadcrumb
  and mobile-header height so only the reading region scrolls. Keep page navigation
  visible with `size-10` targets; contents use a separate tray capped at half the
  reading region. At `sm` and above, use the top toolbar and left contents sidebar.
  Selected text gets one floating bar: Explain answers in place, Ask moves to the
  assistant. The assistant's context line names the selection and can clear it.
- **Flashcards:** reuse `FlashcardCardEditor` everywhere. One toolbar follows the
  focused face; Front and muted Back form one panel matching the review card.
  Faces grow with content, never scroll independently, and only empty create
  editors need a minimum-height floor. Review/exam editing stays inline, with
  Cancel/Save in the session footer, not another dialog.
- **Review scrolling:** the session owns one scroll region. New cards start at
  the top; revealing Back anchors its start while rendering, until the user scrolls.

## Assistant and proposal review

The assistant is one shared collapsible right sidebar, not a floating widget or a
new conversation per surface. Desktop layouts reserve space for it; on mobile it
covers the page and minimizes back to the task. Reuse `AssistantLauncherButton`
in page/session/dialog headers and zen mode.

Dialogs and review sessions host the same assistant inside their own focus/scroll
boundary. Nested hosts restore the previous host on close. Do not expose chat by
raising its layer. The slash-command menu stays in flow above the composer field,
using the shared Command primitives; keyboard focus stays in the textarea.
`/new` and `/bypass` run from the menu. While learning support is off, an indicator
separate from the material-context label says so and offers to turn it back on.

Proposals are reviewed where they change content, not in another overlay:

- Flashcard edits show per-field Accept/Discard controls inside affected inputs;
  unchanged fields remain editable. Chat proposals use the same rich-text
  conversion as the editor; collapsed outcomes remain readable text.
- Note edits replace the editor with a read-only document preview and one
  `DocumentEditReviewControls` bar for the whole proposal. Title changes show
  original and suggested text together. Chat shows only a compact outcome.
- Additions use success intent colors; removals use danger colors and strikethrough.
  Decorations never become stored content. Resolve proposals before saving;
  acceptance uses normal persistence and undo.

Proposal validity and approval rules belong in
[Behavior Contracts](./docs/behavior-contracts.md#assistant-trust-and-approval),
not this visual guide.

## Motion

Use narrow transitions: colors for hover/focus, opacity/transform for motion.
Reserve `transition-all` for width-animated progress bars and unmodified primitives.
Gate entrance animations with `motion-safe:`; repeated interactions should take
200ms or less. Reduced-motion users get instant changes.
