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
- Subjects table shows subject title, notes count, and compact row actions. It does not show status, created, or updated columns.
- Subject fields: name.

### Documents

- Each subject has a Documents area that holds both notes and mindmaps together.
- The documents sidebar lists notes and mindmaps in one list ordered by most recent update, with a leading icon per item that distinguishes notes from mindmaps.
- A single "Create" action offers "Note" or "Mindmap"; each prompts for a title and opens the new item.
- Subject detail previews the 3 most recently updated documents (notes and mindmaps), with row links to each item, the "Create" action, and compact row action menus (edit title for notes, delete for both).
- The full documents list shows a simple center indicator until a document is selected.
- Note and mindmap detail pages offer a zen mode toggle next to the document actions menu. Zen mode expands the editor or canvas to a full-screen, distraction-free view that hides the navbar, back link, and documents sidebar while keeping the title and document actions available. `Escape` or the toggle exits; an `Escape` that closes a dialog, menu, or inline connection-label edit does not also exit zen mode.
- There is no standalone top-level mindmaps route; mindmaps live only inside their subject.

#### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, tables, LaTeX math, and other shared editor formatting exposed by the app.
- Math renders with KaTeX in both editing and reading. Inline math is typed as `$...$`; the `/math` slash command inserts a block equation. Equations are editable by clicking them, and their LaTeX stays searchable.
- Note detail shows the subject's documents in the shared documents sidebar, exposes compact row action menus for title edits (notes) and deletes (notes and mindmaps), and edits the active note inline with auto-save.
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
- Canvas keyboard shortcuts (suppressed while typing in a field): `V` switches to select mode, `H` switches to pan mode, holding `Space` pans temporarily, `Tab` adds a child to the selected node in its allowed branch direction, and `Delete`/`Backspace` removes the selected node and its descendants.
- Connections flow horizontally between the left and right sides of nodes. The map grows by branching: the root shows "+" buttons on its left and right, while non-root nodes only show the "+" button for their root-branch side. Dragging a connection onto empty canvas also creates a new node linked to the source. There is no standalone "add node" button. A newly created node is selected and immediately in edit mode so the user can type right away. Leaving the browser or app while editing a node label preserves the active editor so typing can continue after returning.
- Selecting a node shows a floating toolbar with bold, italic, a color picker, an image button, and delete. The image button uploads a picture that renders inside the node; a selected node with an image shows a remove control. Deleting a node also deletes its descendants so no children are orphaned. The root node is permanent and only offers the two add-child buttons.
- Node images upload to the shared attachment storage under the `mindmaps` context; removing an image or deleting a node/mindmap cleans up the orphaned blob.
- Selecting a connection shows an on-edge toolbar with arrowhead options (none, at the source node, at the target node, or both ends). Double-clicking a connection edits its label inline. Connections cannot be deleted, to avoid orphaning nodes.
- Connections can be moved: drag either endpoint onto another node to re-attach it, or drag the connection's midpoint to bend the curve. The bend persists.
- Adding a child onto an already-occupied position stacks the new node below the existing one instead of overlapping.
- Undo and redo are available with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for adds, moves, deletes, styling, reconnection, and bending.
- Nodes and edges are stored as a JSON graph, including per-node color, bold, italic, and root kind, plus per-edge source/target handles, label, direction, and curve offset. The canvas recolors with the active theme.

### Flashcards

- Create, read, update, and delete flashcards within decks.
- The flashcards manage table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Flashcard manage search ranks front matches before back matches, deck-name matches, and recency tie-breakers.
- Flashcard fields: front and back rich text.
- Flashcard create and edit support AI generation of the back when the back is empty.
- Flashcards can also be generated from a note detail page when AI is configured.
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

- Configure `totalClasses` and `maxMisses` per subject.
- Record and delete misses by date.
- Show progress, remaining misses, and attendance rate.

### Assessments

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

### Global Search

- Search subjects, notes, and flashcards by text with case-insensitive matching.
- Flashcard search results navigate to the flashcard detail page.
- Flashcard search results display deck paths using `::` notation.
- Search is user-scoped and accessible from the navbar.
- Empty search returns user data without text filtering, capped by configured result limits.
- Search results are cached on the client and invalidated after related mutations.
- Search result text matching the query is highlighted in results, with matched phrases kept centered in preview snippets. Standard light and dark themes use the warning highlight color; custom themes use theme-native highlight colors. Highlighting is rendered safely without raw HTML injection.
- Empty queries show unfiltered data without highlighting.

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

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, mindmaps, flashcards, attendance records, and assessments.
- Account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `instance_state`
  - `id`, `initialAdminUserId`, `initialAdminAssignedAt`, timestamps
- `subject`
  - `id`, `name`, `totalClasses`, `maxMisses`, timestamps, `userId`
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

## Out of Scope

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
