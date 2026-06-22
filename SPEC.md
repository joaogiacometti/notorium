# Notorium — Product Specification

## Document Scope

- This file is the source of truth for current product behavior, UX rules, feature constraints, and acceptance criteria.
- Keep it stable and concise.
- Do not use this file for contributor workflow, coding conventions, setup instructions, or deployment steps.
- Do not track future ideas, refactor history, or bug-fix history here.

## Product Goal

Notorium helps students organize academic work in one place by combining subjects, notes, mindmaps, flashcards, a PDF library, attendance tracking, assessments, and fast personal search.

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

- Create, read, update, and hard-delete subjects.
- Subjects list as a table with search, sorting, page size controls, row selection, and bulk delete.
- Subjects table shows subject title, notes count, and compact row actions. It does not show status, created, or updated columns. General subjects show a "General" tag next to their title.
- Subject fields: name and kind.
- Subject names must be unique per user. Creating or renaming a subject to a name already used by another of the user's subjects is rejected with a duplicate-name error. Uniqueness is case-sensitive.
- Each subject has a kind, chosen at creation and editable later: `academic` or `general`.
  - Academic subjects expose attendance and assessment tracking. Their detail page is the dashboard for both, and is the only thing the sidebar tree can't surface, so clicking an academic subject in the sidebar opens it. In the sidebar tree a graduation-cap icon marks academic subjects and their label underlines on hover to signal it is a link.
  - General subjects hold only documents (notes and mindmaps), with no attendance or assessment features, so non-academic users are not forced into study-tracking tools. They have no dashboard, so they are pure containers managed entirely in the sidebar tree: a folder icon marks them and their label is inert (expand via the chevron), shows no navigation cursor, and does not underline on hover. Visiting a general subject's URL directly renders a short notice pointing back to the sidebar.
- New subjects default to `academic`. Existing subjects are `academic`.
- Switching a subject from academic to general hides its attendance and assessment features without deleting the underlying records; switching back reveals them again.

### Documents

- Each subject has a Documents area that holds both notes and mindmaps together.
- Document navigation lives in the global subject tree sidebar (the app frame): expanding a subject lists its notes and mindmaps, so note and mindmap detail pages no longer carry their own in-page documents sidebar and the editor or canvas spans the full content width.
- Each note and mindmap row in the tree sidebar has a kebab menu with the same actions as that document kind's detail-page header menu, working without opening the document: notes offer Edit, Generate flashcards (when AI is configured; disabled until a subject exists), Copy as rich text, Copy as plain text, and Delete; mindmaps offer Edit, Generate flashcards (when AI is configured; disabled until a subject exists), Export as PNG, and Delete. These act on the document's last saved state; renames and deletes refresh the subject's rows in place.
- Document row management (rename, delete, generate, export) happens through the subject tree sidebar's kebab menus. The sidebar remains the persistent navigator; an academic subject's own page is its attendance/assessment dashboard, not a documents list.
- The tree sidebar supports drag-and-drop reorganization. A subject (including a subsubject) can be dragged onto another subject to become its child, or onto the "Move to top level" zone to become a root subject; a subject cannot be dropped onto itself, its current parent, or one of its own descendants. A note or mindmap can be dragged onto any subject to move it under that subject; documents cannot be dropped on the top-level zone (every document belongs to a subject) or onto the subject they already belong to. Moves are rejected when the destination would exceed its note or mindmap limit, and the dragged row shows a spinner while the move is in flight. The destination branch expands to reveal the moved item.
- Each subject's sidebar kebab menu groups its create actions under a "New" submenu offering Subfolder, Note, or Mindmap; each prompts for a title and opens the new item.
- A subject's page is reached only for the academic dashboard. A sticky top bar shows the subject's full ancestor path as a breadcrumb (each academic segment links to its page; general ancestors render as plain text since they have no page), so the body carries no separate title block. For academic subjects the body is the attendance summary and the assessment summary, each with its own create/manage actions and empty states. A general subject's page shows only a short dashed-card notice that its notes, mindmaps, and subfolders are managed in the sidebar.
- Note and mindmap detail pages offer a zen mode toggle next to the document actions menu. Zen mode expands the editor or canvas to a full-screen, distraction-free view that hides the breadcrumb bar while keeping the title and document actions available. `Escape` or the toggle exits; an `Escape` that closes a dialog, menu, or inline connection-label edit does not also exit zen mode.
- There is no standalone top-level mindmaps route; mindmaps live only inside their subject.

#### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, tables, LaTeX math, and other shared editor formatting exposed by the app.
- Math renders with KaTeX in both editing and reading. Inline math is typed as `$...$`; the `/math` slash command inserts a block equation. Equations are editable by clicking them, and their LaTeX stays searchable.
- Note detail edits the active note inline with auto-save across the full content width. The header kebab (three-dot) menu offers Edit (focuses the inline title), Generate flashcards (when AI is configured), Copy as rich text, Copy as plain text, and Delete.
- Note detail supports copying note content as rich text or plain text.
- Note content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Uploaded images (note, flashcard, mindmap, and assessment image attachments) are automatically optimized to WebP on upload, with a maximum dimension cap, to reduce stored size and bandwidth without a visible quality loss. The original is kept only if optimization would not make the file smaller. Non-image uploads such as PDFs are stored as-is.
- When AI is configured, users can generate flashcards from a note into a selected subject.
- Generated note flashcards are reviewed before creation.

#### Mindmaps

- Create, read, update, and delete mindmaps per subject. Mindmaps are scoped to a subject, like notes, and appear in the subject's documents area.
- Mindmap detail edits a full-width node-and-edge canvas centered on a distinct root node whose label stays in sync with the mindmap title (editing either updates the other). Users edit node labels (double-click), connect nodes with edges, drag nodes, and pan/zoom. Title and graph changes auto-save. The canvas opens fit-to-view so the saved graph (including the root) is centered in the viewport on load, never stranding the user on empty canvas.
- The header kebab (three-dot) menu offers Edit, Generate flashcards (when AI is configured), Export as PNG, and Delete. Export as PNG rasterizes the whole map (framed with even padding, on the active theme's background) and downloads it as a file named after the mindmap title. Exporting a mindmap that is not currently open renders its saved graph offscreen before capturing.
- When AI is configured, users can generate flashcards from a mindmap into a selected subject. The AI source is a nested outline of the map's node labels and edge-relation labels (cross-connections excluded), so card quality reflects how detailed the map is. Generated mindmap flashcards are reviewed before creation.
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

- Create, read, update, and delete flashcards within subjects.
- The flashcards manage table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Flashcard manage search ranks front matches before back matches, subject-name matches, and recency tie-breakers.
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
- Flashcards have a global top-level page with review and management views.
- The default flashcards page opens in the review view, with management available as an alternate global view.
- Flashcards have a dedicated flat detail page at `/flashcards/[flashcardId]`.
- Flashcard review remains available in the global flashcards page.
- When AI env vars are configured, the manage toolbar shows a sparkles `AI` dropdown with `Validate cards` and `Refine cards` entries; without AI the dropdown is hidden.
- In the flashcards manage toolbar, every icon-only action must show a descriptive tooltip on hover and keyboard focus instead of relying on icon recognition alone.

### Flashcard organization by subject

- Flashcards belong to a subject (`flashcard.subjectId`); there is no separate deck concept.
- Subjects already form the user's hierarchy (see Subjects); flashcards reuse it, so subject paths use `::` notation in display and searchable pickers, and review/manage scoped to a subject include cards from descendant subjects.
- There is no in-page flashcard tree. The flashcards page is two global surfaces — review everything and manage all flashcards — with a subject filter dropdown that scopes the current view via the `?subjectId` URL param.
- The global subject sidebar shows a per-subject "due" indicator counting cards due now in that subject and its descendants; clicking the indicator opens the full-screen review session directly, scoped to that subject.
- Each subject's sidebar kebab menu has a "Review flashcards" entry that opens the full-screen review session directly (scoped to that subject and its descendants, when cards are due; otherwise it lands on the review hub), and a "Manage flashcards" entry that opens the manage view pre-filtered to that subject. Both review entry points request the focus session via a `focus=1` URL flag the review view honors on load.
- Flashcard creation is unavailable until the user has at least one subject; the manage toolbar and document/book generate actions show a hover/focus hint telling the user to create a subject first.
- When creating, editing, moving, or generating a flashcard, the user chooses one of their subjects.
- Deleting a subject deletes its descendant subjects and all flashcards inside that subtree (alongside its notes, mindmaps, and assessments).

### Flashcard Review

- Global review page with a spaced repetition queue.
- Review view is a landing hub with `Start review` and `Start exam` action cards.
- Review answers are `Again`, `Hard`, `Good`, and `Easy`.
- Review uses a memory-state scheduler with learning and relearning stages.
- A 20-minute learn-ahead window is applied to `learning` and `relearning` cards only: a card whose `dueAt` is within the next 20 minutes is treated as due and kept in the current session. This matches Anki's `collapseTime` behavior and prevents short-interval cards (e.g. `Again → 1m`) from vanishing mid-session.
- Review logs are stored per user.
- Review parameters support per-user tuning.
- Users can manually optimize FSRS parameters from the account settings dialog using their review history.
- Users can reset FSRS optimization from the account settings dialog to restore default scheduler tuning without deleting review history or flashcard progress.
- Users can enable automatic FSRS optimization from the account settings dialog when workflows are configured; automatic optimization runs on a fixed 30-day cadence and does not rewrite existing card due dates.
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

### Review activity

- The Home dashboard shows a review-activity card with a heatmap of daily review counts over the last 365 days, rendered as a calendar grid whose cell intensity reflects how many reviews happened that day, plus current and longest day-streak counters derived from the same data. The current streak counts consecutive days with at least one review ending today, and a day with no reviews yet today does not break it.
- The heatmap and streaks aggregate every flashcard review for the user; the card shows an empty-state hint when there are no reviews in the last year.

### Flashcard Refine

- Refine is a mode inside the manage view, entered via the `Refine cards` entry of the manage toolbar AI dropdown. It is only available when AI env vars are configured.
- Refine candidates load on demand when the mode is entered; they are global to the user and are not filtered by the selected subject scope or search.
- While in refine mode the manage area shows the candidates as table rows with per-row actions, and the toolbar shows the mastered/struggling counts plus `Refresh Refine` and `Exit Refine` actions.
- Refine surfaces two groups derived from each card's most recent reviews:
  - Mastered: the last 3 reviews are all `Good` or `Easy`.
  - Struggling: the last 3 reviews are all `Again`.
- `Hard` is neutral: it breaks both streaks without counting toward either group.
- Cards with fewer than 3 reviews never appear; each group is capped at 50 cards.
- Mastered cards offer a "Level up" action:
  - Similar cards are found across all the user's cards via trigram similarity, ranking same-subject matches first.
  - The AI chooses one outcome: relate (preferred), merge (rare), or decline.
  - Relate: the AI proposes one new card testing the relationship between the mastered card and related ones (contrast, computation, application). On accept, the new card is created in the mastered card's subject with fresh scheduling state and the original cards are kept.
  - Merge: only for true redundancy (same fact, different wording). On accept, the merged card replaces the source cards (including the mastered card), which are deleted; lineage rows snapshot each deleted card's front and back.
  - Decline: when no candidate supports a meaningful relationship or merge, the user sees an informational notice instead of a proposal.
  - The user always previews the proposed card — and, for merges, the cards that will be deleted — before accepting.
- Struggling cards offer an "Improve" action: the AI proposes a rewritten back, shown as a before/after diff the user can accept or discard.
- Merge proposals are limited per approved user per day, separately from other AI limits.
- Legacy `view=refine` URLs fall back to the review view.

### Focus Mode

- Full-screen, distraction-free review experience optimized for mobile.
- Due-card review sessions are focus-only and start from the `Start review` action card on the review hub.
- Hides the left menu and all non-essential UI elements.
- Shows progress bar, card content, and rating buttons only.
- Shows a card actions menu for edit, reset review progress, and delete.
- Keyboard shortcuts:
  - `Escape` exits Focus Mode.
- Completion screen provides an exit action back to the review hub.

### Exam Mode

- Accessed from the flashcard review hub via the `Start exam` action card.
- Uses the active subject filter as the exam scope.
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
- Opening a book renders the PDF in a scrollable in-app reader with zoom, single/two-page spread, and fullscreen controls. A Select/Move toggle in the toolbar switches the drag behavior between selecting text and dragging to scroll the page; it defaults to Move on touch devices and Select on desktop, and either can be overridden (on desktop `V` selects and `H` switches to the hand/pan tool). Selecting text shows a floating toolbar next to where the pointer finished selecting; its Copy action copies the selected text to the clipboard and clears the selection, working on both desktop and touch; scrolling dismisses it, and on desktop `Ctrl`/`Cmd+C` also copies the active selection. When AI is configured, the toolbar also offers Ask AI and Flashcards actions for the selected passage. Ask AI opens a chat dialog where the user asks questions about the passage and can ask follow-ups in the same thread; the passage stays pinned as context. Flashcards opens the flashcard generation dialog seeded with the passage, where the user picks a subject, then reviews and selects which generated cards to create (disabled until a subject exists). Pinch zooms on touch and ctrl/cmd+wheel zooms on desktop. A book opens fit to the whole page.
- The reader respects the user's "Dark PDF reader" setting from the Appearance section of account settings. When enabled, it applies a CSS filter to the rendered PDF pages so white backgrounds become dark and text becomes light (similar to Zotero's invert-colors mode); text selection and link annotations stay un-inverted.
- The reader has a left sidebar (desktop only) with a Pages/Content switch: "Pages" shows a virtualized rail of page thumbnails that scroll the book when clicked, and "Content" shows the PDF's table of contents (its embedded outline). Outline entries jump to their destination and record back-history like an internal link; an entry without a target is inert. Books with no embedded outline show an empty-contents message.
- The reader tracks the page currently in view and saves it automatically as the user scrolls, so reopening the book returns to the last page read.
- Saving is debounced while scrolling, deduplicated so unchanged pages are not re-saved, and flushed immediately when the tab is hidden or the reader is closed so a mid-scroll exit is not lost.
- The reader restores to the saved page on open before enabling further saves, and the saved page is clamped to the book's page count.
- The reader also remembers the zoom level per book, stored separately for touch ("mobile") and pointer ("desktop") devices so a phone and a laptop keep independent zooms for the same book. The saved zoom is restored on open once the page is laid out (falling back to the default fit-to-page when none is stored), and changes are persisted with the same debounce, dedupe, and flush-on-hide/close behavior as the reading position.
- The reader's canvas tools include a Highlighter alongside Select/Move. With the Highlighter active, selecting text creates a highlight over it; the newly created highlight is selected so its note panel opens immediately.
- Selecting a highlight opens a panel to write or edit a note attached to it (kept with the highlight, capped at the configured note length) and to delete the highlight. Only the user's own highlights are editable; the PDF's existing annotations stay read-only and links stay clickable.
- Highlights and their notes are saved per book as they are created, edited, and deleted, scoped to the owning user, and are restored into the reader when the book is reopened. Each book is capped at the configured maximum number of highlights.
- Deleting a book removes the stored file, the saved reading position, and all of the book's highlights, and cannot be undone.

### Global Search

- Search subjects, notes, flashcards, mindmaps, and library books by text with case-insensitive matching. Only academic subjects appear as subject results, since general subjects have no page to open; their notes and mindmaps stay searchable.
- Library books match on title and author, and book results navigate to the book reader.
- Flashcard search results navigate to the flashcard detail page.
- Flashcard search results display subject paths using `::` notation.
- Search is user-scoped and accessible from the left menu (and the `Cmd/Ctrl+K` shortcut).
- Empty search returns user data without text filtering, capped by configured result limits.
- Search results are cached on the client and invalidated after related mutations.
- Search result text matching the query is highlighted in results, with matched phrases kept centered in preview snippets. Standard light and dark themes use the warning highlight color; custom themes use theme-native highlight colors. Highlighting is rendered safely without raw HTML injection.
- Empty queries show unfiltered data without highlighting.

### Command Palette

- Pressing `Ctrl`/`Cmd+P` opens a command palette for running actions and navigating, separate from Global Search (`Ctrl`/`Cmd+K`). The browser print shortcut is suppressed while the palette is available.
- Commands are searchable by name and keyword and grouped as Create, Windows, Go to, and Settings.
- Create commands open the existing create dialogs: Subject, Flashcard, Assessment, Note, and Mindmap.
- Creating a Note or Mindmap requires a subject: on a subject page the current subject is used; elsewhere the palette shows a subject picker step before opening the create dialog. Created notes and mindmaps navigate to their detail page.
- Go to commands navigate to Flashcards, Planning, and Library.
- Settings commands switch the theme (Light, Dark, System), open the account settings dialog, and open the keyboard shortcuts help dialog.
- The palette hotkey is suspended while another dialog is open.

### Floating Windows

- The palette's Windows commands let a user open a Mindmap editor, Note editor, or the Flashcard create form as a floating window layered over the current page, without navigating away. This is the way to keep reading a PDF in the Library reader while editing a mindmap or capturing flashcards.
- "New Mindmap/Note in Window" reuses the same subject + title create flow as the normal create commands, but opens the new document in a window instead of navigating. "New Flashcard in Window" opens the create form directly. "Open Document in Window" lists existing notes and mindmaps to open one by id.
- Only one window is visible at a time; the rest are minimized to a bottom dock (taskbar). Clicking a dock chip restores that window and minimizes whichever was visible, so the user alternates a window with the page behind it. `Esc` minimizes the active window. The dock chip shows each window's icon and live title and can close the window.
- The window overlay has no modal backdrop, so the page behind stays visible and interactive around the panel. Windowed editors autosave exactly like their full-page versions; deleting a document from inside a window closes that window. Inactive windows stay mounted (hidden) so their editor state and unsaved input survive minimize/restore. Open windows persist while navigating between app pages.
- Closing a window (its title-bar close button or its dock chip's close button) guards unsaved work the same way the editors do everywhere else: the flashcard create window prompts to discard when the form has content, while note and mindmap windows flush any pending autosave before closing so no in-flight edit is lost. Minimizing never discards anything.
- A window can be moved by dragging its title bar and resized by dragging any edge or corner, so the user can park it aside and keep reading the page underneath. New windows open at a cascaded position; each window remembers its position and size for the session and is clamped to stay on screen, down to a minimum usable size.

### Keyboard Shortcuts Help

- Pressing `?` outside an editable field opens a keyboard shortcuts dialog.
- The dialog lists every shortcut grouped by where it applies: Global, Notes editor, Mindmap, and Flashcard review.
- Groups whose shortcuts are usable on the current page are highlighted at the group level (accented card and header with a "This page" badge); individual rows keep uniform styling. Global is always highlighted.
- It includes typed triggers alongside key chords: `/table` and `/math` slash commands, inline `$...$` math, and pasted `$$...$$` block math.

### Account

- Account settings open in a dialog (not a route), reachable from the account menu ("Settings") and the "Open Settings" command. The dialog has a left sidebar of sections (Account, Appearance, Notifications, Flashcards) and renders the active section on the right; its data is fetched lazily when the dialog opens.
- The sidebar has a search box; typing filters individual settings rows across every section into one flat list (matching row labels and keywords), replaces the content heading with the quoted query, and swaps the section list for a "Clear Search" control. Clearing the search restores the section list.
- A `?settings=<section>` query parameter on any app page opens the dialog to that section once on load, then strips the parameter from the URL.
- View account details and update display name.
- View flashcard optimization status, including the last FSRS optimization date.
- Reset flashcard optimization to default FSRS tuning while keeping review history.
- Admin-only access management page to approve, block, or set pending for users (separate `/admin` route).
- Delete account and all user-owned data.

### Email Notifications

- Users can opt in to daily email reminders for upcoming pending assessments.
- Only approved users are eligible to receive reminder emails.
- Notifications are disabled by default; users enable them from the Notifications section of the account settings dialog.
- Users choose a lead time of 1, 3, or 7 days before the assessment due date.
- An email is triggered by calling `GET /api/notifications/assessments` (secured with `Authorization: Bearer <CRON_SECRET>`).
- The endpoint is designed to be called once per day by a GitHub Actions workflow.
- Each email lists the user's pending assessments that fall within their configured window, along with subject names and due dates.
- The email contains a link to the planning page and a footer link that opens the notifications settings (`/planning?settings=notifications`).
- Requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` environment variables; if unconfigured, the endpoint returns `503`.
- The "Email Notifications" preferences card and its settings dialog section are hidden unless both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured, and notification preferences are not queried from the database.

### UI/UX Baseline

- Responsive layout for desktop and mobile.
- The left menu holds the account menu, Search, the global section links (Home, Planning, Flashcards, Library), and the subject tree. On launch and after login the user lands on the Home dashboard (`/`); signed-out users are sent to the login page. The Home dashboard greets the user and surfaces overview cards: flashcards due for review, the soonest upcoming assessments (up to three), a review-activity heatmap with study streaks, recently edited documents (notes and mindmaps across all subjects), and recently opened library books (each linking to its reader). Subjects are managed in the sidebar tree, not on the dashboard. On desktop the menu can be collapsed via a toggle in its header; while collapsed a floating button restores it, and the collapsed state persists across reloads. On mobile it opens from a top "Menu" sheet instead.
- Every page shows a sticky top bar with a breadcrumb trail (e.g. `Subject / Documents / Note`) that indicates the current location and replaces per-page "Back to …" links. Intermediate crumbs link to ancestors; the current page is the unlinked final crumb.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Dialog mutation feedback follows a two-mode rule: **close on success** for straightforward create/edit dialogs (user sees the result appear in the list); **button saved state** (1200 ms "Saved ✓" transition on the submit button) for dialogs that stay open as a progress checkpoint, where the user continues working after saving (e.g. create flashcard, edit flashcard). Inline auto-save surfaces compact saving, saved, and error status near the edited content.
- Action confirmation dialogs use one shared layout and footer pattern. Reversible or non-destructive confirmations use the primary confirm button; irreversible delete/remove/discard confirmations use destructive styling.
- Theme toggle with `light`, `dark`, `halloween`, `catppuccin-mocha`, and `system`; authenticated users choose it from the Appearance card in account settings, and signed-out users access it from a floating top-right control.
- A "Dark PDF reader" toggle in the Appearance card inverts the colors of PDF pages in the library reader and persists the choice to the user record.
- Installed PWA launch uses the static dark theme background before app code loads; browser and installed PWA chrome follows the active theme after the app loads, including `halloween` and `catppuccin-mocha`.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 50 subjects.
- A user can create a maximum of 100 notes per subject.
- A user can create a maximum of 100 mindmaps per subject.
- A mindmap can have a maximum of 200 nodes.
- A user can create a maximum of 50 assessments per subject.
- A user can create a maximum of 2000 flashcards per subject.
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
  - `id`, `name`, `parentSubjectId`, `kind` (`academic` | `general`), `totalClasses`, `maxMisses`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `ease`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `subjectId`, timestamps, `userId`
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
  - `id`, `title`, `author`, `fileName`, `blobPathname`, `sizeBytes`, `totalPages`, `currentPage`, `zoomMobile`, `zoomDesktop`, `lastReadAt`, timestamps, `userId`
- `library_annotation`
  - `id`, `bookId`, `annotationUid`, `pageIndex`, `data` (JSON highlight object whose `contents` field holds the note), timestamps, `userId`

## Out of Scope

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
