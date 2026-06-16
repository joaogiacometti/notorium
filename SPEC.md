# Notorium — Product Specification

## Document Scope

- This file is the source of truth for current product behavior, UX rules, feature constraints, and acceptance criteria.
- Keep it stable and concise.
- Do not use this file for contributor workflow, coding conventions, setup instructions, or deployment steps.
- Do not track future ideas, refactor history, or bug-fix history here.

## Product Goal

Notorium helps students organize academic work in one place by combining subjects, notes, flashcards, attendance tracking, assessments, and fast personal search.

## Target Users

Students who want a private, lightweight study management workspace.

## Core Scope

### Authentication

- Email/password sign up, sign in, and sign out.
- Session-based access control across the app.
- The first account on a new instance becomes an approved admin automatically.
- Later accounts start with pending access status and require admin approval.
- Only approved users can access authenticated app routes and server actions.
- Blocked and pending users are denied sign in with an access-status error.
- Admin users can manage user access status (`pending`, `approved`, `blocked`) from an Admin Panel in the account menu.
- Password reset is available only when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured.
- Password reset emails are sent only for approved users; missing, pending, and blocked accounts receive the same generic UI response.
- Approved users can request at most 3 password reset emails per UTC day.
- Password reset links expire after 1 hour, and active sessions are revoked after a successful password reset.

### Subjects

- Create, read, update, and delete subjects.
- Archive and restore subjects.
- Subjects list as a table with search, sorting, active/archived filters, page size controls, row selection, and bulk archive/restore/delete.
- Subjects table shows subject title, notes count, and compact row actions. It does not show status, created, or updated columns. General subjects show a "General" tag next to their title.
- Subject fields: name and kind.
- Each subject has a kind, chosen at creation and editable later: `academic` or `general`.
  - Academic subjects expose attendance and assessment tracking on their detail page, in addition to documents.
  - General subjects hold only documents (notes and mindmaps), with no attendance or assessment features, so non-academic users are not forced into study-tracking tools.
- New subjects default to `academic`. Existing subjects are `academic`.
- Switching a subject from academic to general hides its attendance and assessment features without deleting the underlying records; switching back reveals them again.

### Documents

- Each subject has a Documents area that holds both notes and mindmaps together.
- The documents sidebar lists notes and mindmaps in one list ordered by most recent update, with a leading icon per item that distinguishes notes from mindmaps.
- The documents sidebar header shows the current subject's name so the active subject is always visible from the documents list and from any open note or mindmap.
- On note and mindmap detail pages and the full documents list, each sidebar row's kebab menu offers the same actions as that document kind's header kebab menu, and every action works without opening the document: notes offer Edit, Generate flashcards (when AI is configured; disabled until a deck exists), Copy as rich text, Copy as plain text, and Delete; mindmaps offer Edit, Generate flashcards (when AI is configured; disabled until a deck exists), Export as PNG, and Delete. Copy and export on a non-open document act on its last saved state; on the open document they act on the live editor content.
- A single "Create" action offers "Note" or "Mindmap"; each prompts for a title and opens the new item.
- Subject detail previews the 3 most recently updated documents (notes and mindmaps), with row links to each item, the "Create" action, and compact row action menus (edit title for notes, delete for both).
- The full documents list shows a simple center indicator until a document is selected; its rows expose the same per-kind kebab actions as the detail-page sidebar.
- Note and mindmap detail pages offer a zen mode toggle next to the document actions menu. Zen mode expands the editor or canvas to a full-screen, distraction-free view that hides the navbar, back link, and documents sidebar while keeping the title and document actions available. `Escape` or the toggle exits; an `Escape` that closes a dialog, menu, or inline connection-label edit does not also exit zen mode.
- There is no standalone top-level mindmaps route; mindmaps live only inside their subject.

#### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, tables, LaTeX math, and other shared editor formatting exposed by the app.
- Math renders with KaTeX in both editing and reading. Inline math is typed as `$...$`; the `/math` slash command inserts a block equation. Equations are editable by clicking them, and their LaTeX stays searchable.
- Note detail shows the subject's documents in the shared documents sidebar with full per-kind row action menus, and edits the active note inline with auto-save. The header kebab (three-dot) menu offers Edit (focuses the inline title), Generate flashcards (when AI is configured), Copy as rich text, Copy as plain text, and Delete.
- Note detail supports copying note content as rich text or plain text.
- Note content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- When AI is configured, users can generate flashcards from a note into a selected deck.
- Generated note flashcards are reviewed before creation.

#### Mindmaps

- Create, read, update, and delete mindmaps per subject. Mindmaps are scoped to a subject, like notes, and appear in the subject's documents area.
- Mindmap detail shows the subject's documents in the shared documents sidebar alongside the canvas, and edits a node-and-edge canvas centered on a distinct root node whose label stays in sync with the mindmap title (editing either updates the other). Users edit node labels (double-click), connect nodes with edges, drag nodes, and pan/zoom. Title and graph changes auto-save.
- The header kebab (three-dot) menu offers Edit, Generate flashcards (when AI is configured), Export as PNG, and Delete. Export as PNG rasterizes the whole map (framed with even padding, on the active theme's background) and downloads it as a file named after the mindmap title. Exporting a mindmap that is not currently open renders its saved graph offscreen before capturing.
- When AI is configured, users can generate flashcards from a mindmap into a selected deck. The AI source is a nested outline of the map's node labels and edge-relation labels (cross-connections excluded), so card quality reflects how detailed the map is. Generated mindmap flashcards are reviewed before creation.
- Canvas keyboard shortcuts (suppressed while typing in a field): `V` switches to select mode, `H` switches to pan mode, holding `Space` pans temporarily, `Tab` adds a child to the selected node in its allowed branch direction, `Delete`/`Backspace` removes the selected node and its descendants, and `Ctrl`/`Cmd+C` copies the selected nodes and their subtrees to the clipboard as a nested markdown outline for pasting into an AI chat (it yields to a live text selection so ordinary copy still works).
- Connections flow horizontally between the left and right sides of nodes. The map grows by branching: the root shows "+" buttons on its left and right, while non-root nodes only show the "+" button for their root-branch side. Dragging a connection onto empty canvas also creates a new node linked to the source. There is no standalone "add node" button. A newly created node is selected and immediately in edit mode so the user can type right away. Leaving the browser or app while editing a node label preserves the active editor so typing can continue after returning.
- Selecting a node shows a floating toolbar with bold, italic, a color picker, an image button, and delete. The image button uploads a picture that renders inside the node; pasting an image from the clipboard (Ctrl/Cmd+V) onto a single selected non-root node attaches it the same way; a selected node with an image shows a remove control. Deleting a node also deletes its descendants so no children are orphaned. The root node is permanent and only offers the two add-child buttons.
- Pasting an image from the clipboard (Ctrl/Cmd+V) onto empty canvas (with no branch node selected) drops a standalone image element at the cursor (or the canvas center when the cursor is elsewhere). Standalone images are not part of the hierarchy: they can be moved, resized (corner handles keep the original aspect ratio), connected to nodes with connections, and deleted on their own without affecting the tree. Their size persists across reloads.
- Node images upload to the shared attachment storage under the `mindmaps` context; removing an image or deleting a node/mindmap cleans up the orphaned blob. Standalone images use the same storage and cleanup.
- Selecting a connection shows an on-edge toolbar with arrowhead options (none, at the source node, at the target node, or both ends). Double-clicking a connection edits its label inline. Connections cannot be deleted, to avoid orphaning nodes.
- Connections can be moved: drag either endpoint onto another node to re-attach it, or drag the connection's midpoint to bend the curve. The bend persists.
- Adding a child onto an already-occupied position stacks the new node below the existing one instead of overlapping.
- A node can be re-parented by dragging it onto another node: the dragged node and its whole subtree move under the target, and the branch flips to the target's side when needed (the root accepts both sides, choosing by drop position). The hovered target is highlighted during the drag. Dropping on empty canvas only repositions, as before. A node cannot be dropped onto itself, its current parent, or one of its own descendants. Re-parenting is undoable in one step. Dragging a multi-node selection only repositions.
- Undo and redo are available with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for adds, moves, deletes, styling, reconnection, and bending.
- Nodes and edges are stored as a JSON graph, including per-node color, bold, italic, and root kind, plus per-edge source/target handles, label, direction, and curve offset. The canvas recolors with the active theme.

### Flashcards

- Create, read, update, and delete flashcards within decks.
- The flashcards manage table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Flashcard manage search ranks front matches before back matches, deck-name matches, and recency tie-breakers.
- Flashcards are one of three types, chosen at creation: basic (front and back rich text), cloze, or image occlusion.
- Basic flashcard fields: front and back rich text.
- Cloze flashcards are authored as a single rich-text source containing one or more deletion markers of the form `{{c1::answer}}`, with an optional hint as `{{c1::answer::hint}}`.
- Each distinct cloze number (`c1`, `c2`, …) becomes its own independently scheduled card (Anki-style siblings): its front hides that deletion (showing the hint when given) while revealing the others, and its back highlights the revealed answer.
- Editing a cloze card edits its source: kept deletions keep their review progress, added deletions become new cards, and removed deletions are deleted.
- Deleting any cloze card deletes the whole note and all its sibling cards.
- Image occlusion flashcards are authored from a single uploaded image (stored in private blob storage) with one or more rectangular mask regions drawn over it, each with an optional label.
- Each mask region becomes its own independently scheduled card (Anki-style siblings): during review every region stays covered ("hide all, guess one"), the tested region is highlighted as the prompt, and the answer side uncovers only that region.
- Editing an image occlusion card edits its image and masks: kept masks keep their review progress, added masks become new cards, and removed masks are deleted; replacing the source image cleans up the previous one and clears all existing masks, since they no longer align to the new image.
- Deleting any image occlusion card deletes the whole note, all its sibling cards, and the shared source image.
- A flashcard's type is fixed after creation and cannot be switched between basic, cloze, and image occlusion on edit.
- Flashcard create and edit support AI generation of the back when the back is empty.
- Flashcards can also be generated from a note or mindmap, via their detail-page header menu or sidebar/documents-list row menu, when AI is configured.
- Generated AI flashcards use concise retrieval-cue fronts and minimal, directly testable answer bullets.
- AI generation may emit LaTeX math (`$...$` inline, `$$...$$` block), which is converted to rendered math nodes.
- AI flashcard generation is optional and configured globally at the instance level with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- AI flashcard controls are hidden when AI env vars are not configured.
- AI generation and validation are limited per approved user per day.
- Flashcard rich text supports the same shared editor capabilities as notes, including syntax-highlighted code blocks, LaTeX math, and supported image rendering.
- Flashcard content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Flashcards have a global top-level page with review, management, and statistics views.
- The default flashcards page opens in the review view, with management and statistics available as alternate global views.
- Flashcards have a dedicated flat detail page at `/flashcards/[flashcardId]`.
- Flashcard review remains available in the global flashcards page.
- When AI env vars are configured, the manage toolbar shows a sparkles `AI` dropdown with `Validate cards` and `Refine cards` entries; without AI the dropdown is hidden.
- In the flashcards manage toolbar, every icon-only action must show a descriptive tooltip on hover and keyboard focus instead of relying on icon recognition alone.

### Decks

- Decks are global to the user and are not owned by subjects.
- Decks support unlimited nesting through `parentDeckId`.
- Deck paths use `::` notation for display and searchable pickers.
- Deck names must be unique among sibling decks, including root-level decks.
- Users can create, rename, and delete decks from the flashcards area.
- Users can add a flashcard to a specific deck from that deck's sidebar actions menu.
- Users can drag decks in the flashcards tree to change parent decks or move them back to the root level.
- Deleting a deck also deletes its child decks and all flashcards inside that subtree.
- The flashcards page uses a deck tree sidebar, and deck-scoped review/manage/statistics include cards from descendant decks.
- Flashcard creation is unavailable until the user has at least one deck; the manage toolbar shows a hover/focus hint telling the user to create a deck first.
- When creating or editing a flashcard, the user must choose one of their decks.

### Flashcard Review

- Global review page with a spaced repetition queue.
- Review view is a landing hub with `Start review` and `Start exam` action cards.
- Review answers are `Again`, `Hard`, `Good`, and `Easy`.
- Review uses a memory-state scheduler with learning and relearning stages.
- A 20-minute learn-ahead window is applied to `learning` and `relearning` cards only: a card whose `dueAt` is within the next 20 minutes is treated as due and kept in the current session. This matches Anki's `collapseTime` behavior and prevents short-interval cards (e.g. `Again → 1m`) from vanishing mid-session.
- Review logs are stored per user.
- Review parameters support per-user tuning.
- Users can manually optimize FSRS parameters from the Account page using their review history.
- Users can reset FSRS optimization from the Account page to restore default scheduler tuning without deleting review history or flashcard progress.
- Users can enable automatic FSRS optimization from the Account page when workflows are configured; automatic optimization runs on a fixed 30-day cadence and does not rewrite existing card due dates.
- Keyboard shortcuts on the review screen:
  - `Enter` or `Space` reveals the back when hidden.
  - `Enter` or `Space` grades `Good` after the back is shown.
  - `e` opens edit flashcard.
  - `d` opens delete flashcard confirmation.
  - `r` opens reset review progress confirmation for the current card.
  - `1` grades `Again` after reveal.
  - `2` grades `Hard` after reveal.
  - `3` grades `Good` after reveal.
  - `4` grades `Easy` after reveal.

### Flashcard Statistics

- Global statistics view in the flashcards page.
- Statistics respect the active deck filter.
- Statistics show overview metrics for cards in scope, including due cards, reviewed vs never-reviewed cards, review/lapse totals, card-state distribution, rating distribution, and recent daily review activity.
- A review activity heatmap shows daily review counts over the last 365 days as a calendar grid whose cell intensity reflects how many reviews happened that day, with current and longest day-streak counters derived from the same data. The current streak counts consecutive days with at least one review ending today, and a day with no reviews yet today does not break it. The heatmap and streaks respect the active deck filter, like the rest of the statistics view, and are hidden when no cards are in scope.

### Flashcard Refine

- Refine is a mode inside the manage view, entered via the `Refine cards` entry of the manage toolbar AI dropdown. It is only available when AI env vars are configured.
- Refine candidates load on demand when the mode is entered; they are global to the user and are not filtered by the selected deck scope or search.
- While in refine mode the manage area shows the candidates as table rows with per-row actions, and the toolbar shows the mastered/struggling counts plus `Refresh Refine` and `Exit Refine` actions.
- Refine surfaces two groups derived from each card's most recent reviews:
  - Mastered: the last 3 reviews are all `Good` or `Easy`.
  - Struggling: the last 3 reviews are all `Again`.
- `Hard` is neutral: it breaks both streaks without counting toward either group.
- Cards with fewer than 3 reviews never appear; each group is capped at 50 cards.
- Mastered cards offer a "Level up" action:
  - Similar cards are found across all the user's cards via trigram similarity, ranking same-deck matches first.
  - The AI chooses one outcome: relate (preferred), merge (rare), or decline.
  - Relate: the AI proposes one new card testing the relationship between the mastered card and related ones (contrast, computation, application). On accept, the new card is created in the mastered card's deck with fresh scheduling state and the original cards are kept.
  - Merge: only for true redundancy (same fact, different wording). On accept, the merged card replaces the source cards (including the mastered card), which are deleted; lineage rows snapshot each deleted card's front and back.
  - Decline: when no candidate supports a meaningful relationship or merge, the user sees an informational notice instead of a proposal.
  - The user always previews the proposed card — and, for merges, the cards that will be deleted — before accepting.
- Struggling cards offer an "Improve" action: the AI proposes a rewritten back, shown as a before/after diff the user can accept or discard.
- Merge proposals are limited per approved user per day, separately from other AI limits.
- Legacy `view=refine` URLs fall back to the review view.

### Focus Mode

- Full-screen, distraction-free review experience optimized for mobile.
- Due-card review sessions are focus-only and start from the `Start review` action card on the review hub.
- Hides navbar and all non-essential UI elements.
- Shows progress bar, card content, and rating buttons only.
- Shows a card actions menu for edit, reset review progress, and delete.
- Keyboard shortcuts:
  - `Escape` exits Focus Mode.
- Completion screen provides an exit action back to the review hub.

### Exam Mode

- Accessed from the flashcard review hub via the `Start exam` action card.
- Uses the active deck filter as the exam scope.
- The first tap/click on `Start exam` loads scoped exam cards and enters exam mode in a single interaction.
- Runs in focus-mode UI with exam progress shown as `Card X of Y`.
- Exam sessions do not modify due-card scheduling state for regular spaced-repetition reviews.
- Exam completion provides a summary screen with a close action and retry-weak-cards action when applicable.

### Attendance

- Available only for academic subjects.
- Configure `totalClasses` and `maxMisses` per subject.
- Record and delete misses by date.
- Show progress, remaining misses, and attendance rate.

### Assessments

- Available only for academic subjects; the planning page and assessment subject pickers list academic subjects only.
- Create, read, update, and delete assessments per subject.
- Assessments have a dedicated global planning page for full management and calendar-based timeline viewing.
- The planning assessments table supports bulk selection with bulk mark pending, bulk mark completed, and bulk delete actions.
- The planning assessments table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Subject detail pages show a minimal assessment summary with the subject average when available and a link to the planning page filtered to that subject.
- The planning assessments view always shows a combined grade/weight column, and enters a subject-focused mode when exactly one subject is selected to additionally show the final grade summary for that subject.
- Assessment fields: title, optional description, type, status, due date, optional score, and optional weight.
- Assessment create and edit support separate study-file attachments stored in private blob storage.
- Assessment attachments are download-only and limited to supported study file types.
- Pending, overdue, and completed states are shown in the UI.
- Subject average from completed assessments with score:
  - weighted average if at least one valid weight exists
  - simple average otherwise

### Library

- A top-level Library section, scoped per user, for uploading PDF books and reading them in the app.
- Add a book by uploading a PDF and providing a title and optional author; the title pre-fills from the file name.
- Only PDF files are accepted, capped at the configured maximum book size, with a per-user daily upload limit.
- Books are private: a user only sees and can open their own books, and the book file is served through an ownership-checked route.
- The library lists books in a paginated table showing title, author, saved reading progress (`Page X of Y` once the page count is known), and when the book was last read; clicking a row opens the book.
- The table can be filtered with a search box that matches book title or author.
- Each row has an actions menu to edit the book's title and author or delete the book; rows can be multi-selected to delete several books at once.
- Opening a book renders the PDF in a scrollable in-app reader with zoom, single/two-page spread, and fullscreen controls. On touch devices a finger drag scrolls the page (instead of selecting text) and pinch zooms; on desktop the mouse selects text and ctrl/cmd+wheel zooms.
- The reader tracks the page currently in view and saves it automatically as the user scrolls, so reopening the book returns to the last page read.
- Saving is debounced while scrolling, deduplicated so unchanged pages are not re-saved, and flushed immediately when the tab is hidden or the reader is closed so a mid-scroll exit is not lost.
- The reader restores to the saved page on open before enabling further saves, and the saved page is clamped to the book's page count.
- Deleting a book removes both the stored file and the saved reading position and cannot be undone.

### Global Search

- Search subjects, notes, and flashcards by text with case-insensitive matching.
- Flashcard search results navigate to the flashcard detail page.
- Flashcard search results display deck paths using `::` notation.
- Search is user-scoped and accessible from the navbar.
- Empty search returns user data without text filtering, capped by configured result limits.
- Search results are cached on the client and invalidated after related mutations.
- Search result text matching the query is highlighted in results, with matched phrases kept centered in preview snippets. Standard light and dark themes use the warning highlight color; custom themes use theme-native highlight colors. Highlighting is rendered safely without raw HTML injection.
- Empty queries show unfiltered data without highlighting.

### Command Palette

- Pressing `Ctrl`/`Cmd+P` opens a command palette for running actions and navigating, separate from Global Search (`Ctrl`/`Cmd+K`). The browser print shortcut is suppressed while the palette is available.
- Commands are searchable by name and keyword and grouped as Create, Go to, and Settings.
- Create commands open the existing create dialogs: Subject, Flashcard, Deck, Assessment, Note, and Mindmap.
- Creating a Note or Mindmap requires a subject: on a subject page the current subject is used; elsewhere the palette shows a subject picker step before opening the create dialog. Created notes and mindmaps navigate to their detail page.
- Go to commands navigate to Subjects, Flashcards, Planning, Archived Subjects, and Account.
- Settings commands switch the theme (Light, Dark, System) and open the keyboard shortcuts help dialog.
- The palette hotkey is suspended while another dialog is open.

### Keyboard Shortcuts Help

- Pressing `?` outside an editable field opens a keyboard shortcuts dialog.
- The dialog lists every shortcut grouped by where it applies: Global, Notes editor, Mindmap, and Flashcard review.
- Groups whose shortcuts are usable on the current page are highlighted at the group level (accented card and header with a "This page" badge); individual rows keep uniform styling. Global is always highlighted.
- It includes typed triggers alongside key chords: `/table` and `/math` slash commands, inline `$...$` math, and pasted `$$...$$` block math.

### Account

- View account details.
- Navigate Account settings sections with in-page shortcuts on the Account page.
- Update display name.
- View flashcard optimization status, including the last FSRS optimization date.
- Reset flashcard optimization to default FSRS tuning while keeping review history.
- Admin-only access management page to approve, block, or set pending for users.
- Delete account and all user-owned data.

### Email Notifications

- Users can opt in to daily email reminders for upcoming pending assessments.
- Only approved users are eligible to receive reminder emails.
- Notifications are disabled by default; users enable them from the Account settings page.
- Users choose a lead time of 1, 3, or 7 days before the assessment due date.
- An email is triggered by calling `GET /api/notifications/assessments` (secured with `Authorization: Bearer <CRON_SECRET>`).
- The endpoint is designed to be called once per day by a GitHub Actions workflow.
- Each email lists the user's pending assessments that fall within their configured window, along with subject names and due dates.
- The email contains a link to the planning page.
- Requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` environment variables; if unconfigured, the endpoint returns `503`.
- The "Email Notifications" preferences card is hidden on the Account page unless both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured, and notification preferences are not queried from the database.

### UI/UX Baseline

- Responsive layout for desktop and mobile.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Dialog mutation feedback follows a two-mode rule: **close on success** for straightforward create/edit dialogs (user sees the result appear in the list); **button saved state** (1200 ms "Saved ✓" transition on the submit button) for dialogs that stay open as a progress checkpoint, where the user continues working after saving (e.g. create flashcard, edit flashcard). Inline auto-save surfaces compact saving, saved, and error status near the edited content.
- Action confirmation dialogs use one shared layout and footer pattern. Reversible or non-destructive confirmations use the primary confirm button; irreversible delete/remove/discard confirmations use destructive styling.
- Theme toggle with `light`, `dark`, `halloween`, `catppuccin-mocha`, and `system`; authenticated users access it from the navbar, and signed-out users access it from a floating top-right control.
- Installed PWA launch uses the static dark theme background before app code loads; browser and installed PWA chrome follows the active theme after the app loads, including `halloween` and `catppuccin-mocha`.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 50 subjects.
- A user can create a maximum of 100 notes per subject.
- A user can create a maximum of 100 mindmaps per subject.
- A mindmap can have a maximum of 200 nodes.
- A user can create a maximum of 50 assessments per subject.
- A user can create a maximum of 2000 flashcards per deck.
- A user can create a maximum of 200 decks.
- A user can upload a maximum of 100 library books, each up to 20 MB, with at most 50 book uploads per UTC day.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, mindmaps, flashcards, attendance records, assessments, and library books.
- Library book files are served only through an ownership-checked route; a user cannot read another user's book or saved page.
- Account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `instance_state`
  - `id`, `initialAdminUserId`, `initialAdminAssignedAt`, timestamps
- `subject`
  - `id`, `name`, `kind` (`academic` | `general`), `totalClasses`, `maxMisses`, timestamps, `userId`
- `deck`
  - `id`, `name`, `parentDeckId`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `ease`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `deckId`, timestamps, `userId`
- `flashcard_scheduler_settings`
  - `id`, `userId`, `desiredRetention`, `weights`, `optimizedReviewCount`, `automaticOptimizationEnabled`, optimization timestamps
- `flashcard_review_log`
  - `id`, `flashcardId`, `userId`, `rating`, `reviewedAt`, `daysElapsed`, timestamps
- `note`
  - `id`, `title`, `content`, `subjectId`, timestamps, `userId`
- `mindmap`
  - `id`, `title`, `data` (JSON graph of nodes and edges), timestamps, `userId`
- `attendance_miss`
  - `id`, `missDate`, `subjectId`, timestamps, `userId`
- `assessment`
  - `id`, `title`, `description`, `type`, `status`, `dueDate`, `score`, `weight`, `subjectId`, timestamps, `userId`
- `library_book`
  - `id`, `title`, `author`, `fileName`, `blobPathname`, `sizeBytes`, `totalPages`, `currentPage`, `lastReadAt`, timestamps, `userId`

## Out of Scope

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
