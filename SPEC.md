# Notorium — Product Specification

## Document Scope

- This file is the source of truth for current product behavior, UX rules, feature constraints, and acceptance criteria.
- Keep it stable and concise.
- Do not use this file for contributor workflow, coding conventions, setup instructions, or deployment steps.
- Do not track future ideas, refactor history, or bug-fix history here.

## Product Goal

Notorium helps people learn: producing, reviewing, and asking about study material with AI, through notes, mindmaps, flashcards, spaced-repetition review, and fast personal search. It is not a school management system.

## Target Users

Learners who want a private, lightweight workspace for making and reviewing study material.

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
- Subjects are listed and managed only in the sidebar subject tree; there is no separate subjects table page. Subjects are deleted one at a time from the tree's row menu.
- Subject fields: name.
- Subject names must be unique among siblings for each user, including top-level subjects. Creating, renaming, or moving a subject to a name already used under the same parent is rejected with a duplicate-name error. The same name can appear under different parents. Uniqueness is case-sensitive.
- Creating a subject with `Parent::Child` uses the existing `Parent` path as the parent and stores `Child` as the new subject name. If any path segment does not exist, it is created automatically in order. When creation starts from a selected parent, the path is resolved relative to that parent. All missing segments are inserted atomically. The `::` delimiter is reserved for path creation and cannot be stored in a renamed subject.
- Subjects are folders: they hold documents (notes and mindmaps), flashcards, and subfolders, and are managed entirely in the sidebar tree. A folder icon marks each subject; its label is inert (expand via the chevron) and shows no navigation cursor. Subjects have no page of their own; visiting `/subjects/[id]` directly redirects home.

### Documents

- Each subject has a Documents area that holds both notes and mindmaps together.
- Document navigation lives in the global subject tree sidebar (the app frame): expanding a subject lists its notes and mindmaps, so note and mindmap detail pages no longer carry their own in-page documents sidebar and the editor or canvas spans the full content width. While a subject's documents load, the expanded subject shows a loading row; if loading fails, that row becomes "Couldn't load documents." with a Retry action instead of spinning forever, and collapsing and re-expanding the subject also retries.
- Each note and mindmap row in the tree sidebar has a kebab menu with the same actions as that document kind's detail-page header menu, working without opening the document: notes offer Edit, Copy as rich text, Copy as plain text, and Delete; mindmaps offer Edit, Export as PNG, and Delete. These act on the document's last saved state; renames and deletes refresh the subject's rows in place.
- Document row management (rename, delete, copy, export) happens through the subject tree sidebar's kebab menus. The sidebar remains the persistent navigator.
- The tree sidebar supports drag-and-drop reorganization. A subject (including a subsubject) can be dragged onto another subject to become its child, or onto the "Move to top level" zone to become a root subject; that zone only appears while dragging a nested subject, since root subjects are already top level. A subject cannot be dropped onto itself, its current parent, or one of its own descendants. A note or mindmap can be dragged onto any subject to move it under that subject; documents cannot be dropped on the top-level zone (every document belongs to a subject) or onto the subject they already belong to. Moves are rejected when the destination would exceed its note or mindmap limit, and the dragged row shows a spinner while the move is in flight. The destination branch expands to reveal the moved item.
- Each subject's sidebar kebab menu groups its create actions under a "New" submenu offering Subfolder, Note, or Mindmap; each prompts for a title and opens the new item.
- Note and mindmap detail pages offer a zen mode toggle next to the document actions menu. Zen mode expands the editor or canvas to a full-screen, distraction-free view that hides the breadcrumb bar while keeping the title and document actions available. `Escape` or the toggle exits; an `Escape` that closes a dialog, menu, or inline connection-label edit does not also exit zen mode.
- There is no standalone top-level mindmaps route; mindmaps live only inside their subject.

#### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, tables, LaTeX math, and other shared editor formatting exposed by the app. A compact toolbar exposes headings, inline formatting, lists, quotes, code blocks, links, tables, and image uploads, with active-format state and keyboard-focus tooltips. The toolbar is not a Tab stop, so Tab moves between fields and straight into the text; Alt+F10 from the text moves into the toolbar, arrow keys/Home/End move within it, and Tab returns to the text.
- Math renders with KaTeX in both editing and reading. Inline math is typed as `$...$`; the `/math` slash command inserts a block equation. Equations are editable by clicking them, and their LaTeX stays searchable.
- Note detail edits the active note inline with auto-save across the full content width. The header kebab (three-dot) menu offers Edit (focuses the inline title), Copy as rich text, Copy as plain text, and Delete.
- Note detail supports copying note content as rich text or plain text.
- Note content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Image uploads accept files up to 4 MiB. Authenticated upload attempts (including invalid or oversized requests) count toward the 200-per-day allowance, checked before reading the body. The total multipart body is capped at 4 MiB plus 64 KiB of overhead; oversized uploads return a size-limit error.
- Uploaded images (note, flashcard, and mindmap images) are automatically optimized to WebP on upload, with a maximum dimension cap, to reduce stored size and bandwidth without a visible quality loss. The original is kept only if optimization would not make the file smaller.
- When AI is configured, users can ask the study assistant to propose flashcards using the open note’s current content, then review and create them in chat.

#### Mindmaps

- Create, read, update, and delete mindmaps per subject. Mindmaps are scoped to a subject, like notes, and appear in the subject's documents area.
- Mindmap detail edits a full-width node-and-edge canvas centered on a distinct root node whose label stays in sync with the mindmap title (editing either updates the other). Users edit node labels (double-click); outside editing, `$...$` and `$$...$$` in labels render as KaTeX math while the raw text stays the edit and search source. Users paste multiline text/code into a single selected node, connect nodes with edges, drag nodes, and pan/zoom. A persistent canvas toolbar exposes add-child, undo, redo, fit-to-view, and in-map node search; searching selects and centers matching nodes, and Enter cycles through matches. Title and graph changes auto-save. The canvas opens fit-to-view so the saved graph (including the root) is centered in the viewport on load, never stranding the user on empty canvas.
- The header kebab (three-dot) menu offers Edit, Export as PNG, and Delete. Export as PNG rasterizes the whole map (framed with even padding, on the active theme's background) and downloads it as a file named after the mindmap title. Exporting a mindmap that is not currently open renders its saved graph offscreen before capturing.
- When AI is configured, users can ask the study assistant to propose flashcards using the open mindmap’s current content, then review and create them in chat.
- Canvas keyboard shortcuts (suppressed while typing in a field): `V` switches to select mode, `H` switches to pan mode, `Ctrl`/`Cmd+F` focuses node search, holding `Space` pans temporarily, `Tab` adds a child to the selected node in its allowed branch direction (on the root, it chooses the side with fewer direct children), `Delete`/`Backspace` removes the selected node and its descendants, and `Ctrl`/`Cmd+C` copies the selected nodes and their subtrees to the clipboard as a nested markdown outline for pasting into an AI chat (it yields to a live text selection so ordinary copy still works).
- Tree connections flow horizontally between the left and right sides of nodes. Manual cross-connections can attach to any side of a node. The map grows by branching: the root shows "+" buttons on its left and right, while non-root nodes only show the "+" button for their root-branch side. `Tab` adds a child to the lighter root side when the root is selected, otherwise in the selected node's allowed branch direction; `Shift+Enter` adds a sibling below the selected node. Dragging a connection onto empty canvas does not create a node. There is no standalone "add node" button. A newly created node is selected and immediately in edit mode so the user can type right away. Leaving the browser or app while editing a node label preserves the active editor so typing can continue after returning.
- Selecting a node shows a floating toolbar with bold, italic, a color picker, an image button, break into new mindmap, and delete. Breaking a node into a new mindmap moves that node and its descendants into a new mindmap in the same subject, using the selected node's label as the new title. The image button uploads a picture that renders inside the node; pasting an image from the clipboard (Ctrl/Cmd+V) onto a single selected non-root node attaches it the same way; a selected node with an image shows a remove control. Deleting a node also deletes its descendants so no children are orphaned. The root node is permanent and only offers the two add-child buttons.
- Pasting an image from the clipboard (Ctrl/Cmd+V) onto empty canvas (with no branch node selected) drops a standalone image element at the cursor (or the canvas center when the cursor is elsewhere). Standalone images are not part of the hierarchy: they can be moved, resized (corner handles keep the original aspect ratio), connected to nodes with connections, and deleted on their own without affecting the tree. Their size persists across reloads.
- Node images upload to the shared attachment storage under the `mindmaps` context; removing an image or deleting a node/mindmap cleans up the orphaned blob. Standalone images use the same storage and cleanup.
- Selecting a connection shows an on-edge toolbar with arrowhead options (none, at the source node, at the target node, or both ends). Double-clicking a connection edits its label inline. Connections cannot be deleted, to avoid orphaning nodes.
- Connections can be moved: drag either endpoint onto another node to re-attach it, or drag the connection's midpoint to bend the curve. The bend persists.
- Adding a child onto an already-occupied position stacks the new node below the existing one instead of overlapping.
- A node can be re-parented by dragging it onto another node: the dragged node and its whole subtree move under the target, and the branch flips to the target's side when needed (the root accepts both sides, choosing by drop position, including left/right moves for an existing root child). Dropping almost inside another node makes the dragged node its child; dropping just outside the top or bottom of another branch node inserts the dragged node as that node's sibling on that side. The hovered target is highlighted during the drag. Dropping a single tree node on empty canvas reorders it among its siblings by vertical drop position and snaps the branch back into the layout; standalone images and multi-node selections only reposition. A node cannot be dropped onto itself, its current parent without changing sides, or one of its own descendants. Re-parenting is undoable in one step.
- Undo and redo are available with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for adds, moves, deletes, styling, reconnection, and bending.
- Nodes and edges are stored as a JSON graph, including per-node color, bold, italic, and root kind, plus per-edge source/target handles, label, direction, and curve offset. The canvas recolors with the active theme.

### Flashcards

- Create, read, update, and delete flashcards within subjects.
- The flashcards manage table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Flashcard manage search ignores case and accents, and ranks front matches before back matches, subject-name matches, and recency tie-breakers.
- Flashcard fields: front and back rich text.
- Flashcards proposed while a note or mindmap is active retain that document as their source when created directly or through the proposal's Edit dialog. The source is captured with the request, so later navigation does not change older proposals. Cards requested without document context have no source; sources are not inferred from chat history or library search.
- A card with a source shows one consistent "From <document title>" link, with a note or mindmap icon, as muted header metadata: under the subject heading in card detail, under the Edit Flashcard dialog title (from manage or review), and on the subject row in review/exam after answer reveal. The dialog and session links open a new tab so unsaved edits and session progress are kept. Links use the document's current title and subject, following renames and moves. Editing, moving, resetting, or refining a card preserves its source. Deleting a source removes the link while keeping the card; existing cards remain without sources.
- The Create and Edit Flashcard dialogs open with focus on the dialog itself, never on a field or editor toolbar button, so no focus ring or tooltip appears on open; Tab starts at the first field.
- Source references are validated and ownership-checked on creation; users cannot attach another user's document.
- Flashcard create/edit dialogs and inline detail editors use the study assistant for conversational improvements and filling an empty back; there are no separate Generate/Improve with AI buttons in these editors.
- AI flashcard creation uses the study assistant, including requests based on an open note or mindmap. Document menus and mindmap branch toolbars have no dedicated generation actions.
- Generated AI flashcards use concise retrieval-cue fronts and minimal, directly testable answer bullets.
- AI generation may emit LaTeX math (`$...$` inline, `$$...$$` block), which is converted to rendered math nodes.
- AI output follows the user's language: generated and improved cards use the language of the source material or cards; nothing is translated to English.
- AI flashcard generation is optional and configured globally at the instance level with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- AI flashcard controls are hidden when AI env vars are not configured.
- AI generation and improvement are limited per approved user per day.
- Flashcard rich text supports the same shared editor capabilities as notes, including syntax-highlighted code blocks, LaTeX math, and supported image rendering.
- Flashcard content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Flashcards have a global top-level page with review and management views.
- The default flashcards page opens in the review view, with management available as an alternate global view.
- Flashcards have a dedicated flat detail page at `/flashcards/[flashcardId]`. Its header mirrors note and mindmap pages: the subject path as the title row beside the actions menu, with the source link under it when the card has one; it does not show creation time. Front and Back editors sit side by side on wide screens and stack on narrow ones.
- Flashcards can be copied as Markdown for pasting into an AI chat or sharing with others. A single card copies from the manage table row menu, the detail-page header menu (with the content currently in its editors), or the review/exam session card actions menu; the manage toolbar's `Copy` action copies every selected row at once, in table order. Each card copies its subject path, front, and back; several cards get numbered `## Card N` headings separated by `---`. Rich text becomes Markdown (bold, italics, strikethrough, inline code, links, lists, task lists, code blocks, tables, and LaTeX math as `$...$`/`$$...$$`). Uploaded images are private to their owner, so they copy as `[Image]` placeholders; public image URLs copy as Markdown images. A toast confirms how many cards were copied or reports the failure, including when the cards no longer exist. The toolbar `Copy` action stays disabled with a spinner until every copy in progress finishes.
- Flashcard review remains available in the global flashcards page.
- Full-screen flashcard review and exam sessions lock background page scrolling until exit, including the caught-up state. Review content scrolls within the session only when it exceeds the available screen space.
- When AI env vars are configured, the manage toolbar shows a `Refine cards` button; without AI it is hidden.
- In the flashcards manage toolbar, every icon-only action must show a descriptive tooltip on hover and keyboard focus instead of relying on icon recognition alone.

### Flashcard organization by subject

- Flashcards belong to a subject (`flashcard.subjectId`); there is no separate deck concept.
- Subjects already form the user's hierarchy (see Subjects); flashcards reuse it, so subject paths use `::` notation in display and searchable pickers, and review/manage scoped to a subject include cards from descendant subjects.
- There is no in-page flashcard tree. The flashcards page is two global surfaces — review everything and manage all flashcards — with a subject filter dropdown that scopes the current view via the `?subjectId` URL param.
- The global subject sidebar shows a per-subject "due" indicator counting cards due in that subject and its descendants with the same rule as the review queue (including the learn-ahead window below), refreshed after every flashcard write and, for review sessions, once grading settles and focus mode closes, when the review hub also re-reads its due count so both match; clicking the indicator opens the full-screen review session directly, scoped to that subject.
- Each subject's sidebar kebab menu has a "Review flashcards" entry that opens the full-screen review session directly (scoped to that subject and its descendants, when cards are due; otherwise it lands on the review hub), and a "Manage flashcards" entry that opens the manage view pre-filtered to that subject. Both review entry points request the focus session via a `focus=1` URL flag the review view honors on load.
- Flashcard creation from the manage toolbar is available before a subject exists because the create form can create one inline.
- When creating, editing, moving, or generating a flashcard, the user chooses one of their subjects. The new-flashcard and move-flashcards subject pickers let the user create a subject from the filtered list when their search does not exactly match an existing subject path (case-insensitive): a plain name creates a root subject, while a `::` path reuses any existing leading segments and creates the missing ones as nested subjects. The created subject is selected automatically, and `::` path searches show existing path patterns segment-by-segment so users can autocomplete nested subjects.
- Deleting a subject deletes its descendant subjects and all flashcards inside that subtree (alongside its notes and mindmaps).

### Flashcard Review

- Global review page with a spaced repetition queue.
- Review view is a landing hub with `Start review` and `Start exam` action cards.
- Review answers are `Again`, `Hard`, `Good`, and `Easy`.
- Grading advances to the next card immediately while the grade saves in the background; if a save fails, the card returns to the front of the queue with an error toast so it can be graded again. While grades are still saving, leaving or reloading the page asks for confirmation first. When the queue runs empty while more cards are due and still loading, the session shows a loading state instead of "All caught up".
- Review uses a memory-state scheduler with learning and relearning stages.
- A 20-minute learn-ahead window is applied to `learning` and `relearning` cards only: a card whose `dueAt` is within the next 20 minutes is treated as due and kept in the current session. This matches Anki's `collapseTime` behavior and prevents short-interval cards (e.g. `Again → 1m`) from vanishing mid-session.
- Review logs are stored per user and retained when a flashcard or subject is
  deleted, so historical activity and FSRS optimization input do not change.
- After grading a regular review card, users can undo that latest grade from the
  review session's kebab menu; undo restores the card's prior scheduling state
  and removes that review from activity and optimization history. Undo is
  offered once every pending grade has saved. The review actions trigger shows a disabled loading spinner while undo is in progress.
- Review parameters support per-user tuning.
- Users can manually optimize FSRS parameters from the account settings dialog using their review history.
- Users can reset FSRS optimization from the account settings dialog to restore default scheduler tuning without deleting review history or flashcard progress.
- Users can enable automatic FSRS optimization from the account settings dialog when workflows are configured; automatic optimization selects opted-in users who have never optimized or whose last optimization was more than 30 days ago when the scheduled job runs (the bundled workflow runs monthly) and does not rewrite existing card due dates.
- Keyboard shortcuts on the review screen:
  - `Enter` or `Space` reveals the back when hidden.
  - `Enter` or `Space` grades `Good` after the back is shown.
  - `e` opens edit flashcard.
  - `d` opens delete flashcard confirmation.
  - `u` undoes the last review while an undo is available (not in exam mode).
  - `r` opens reset review progress confirmation for the current card.
  - `1` grades `Again` after reveal.
  - `2` grades `Hard` after reveal.
  - `3` grades `Good` after reveal.
  - `4` grades `Easy` after reveal.

### Review activity

- The Home dashboard shows a review-activity card with a heatmap of daily review counts over the last 365 days, rendered as a calendar grid whose cell intensity reflects how many reviews happened that day, plus current and longest day-streak counters derived from the same data. The current streak counts consecutive days with at least one review ending today, and a day with no reviews yet today does not break it.
- The heatmap and streaks aggregate every flashcard review for the user; the card shows an empty-state hint when there are no reviews in the last year.

### Flashcard Refine

- Refine is a mode inside the manage view, entered via the `Refine cards` button in the manage toolbar. It is only available when AI env vars are configured.
- Refine lists struggling cards (leeches): cards that have lapsed (been forgotten after graduating) at least 4 times, matching Anki's first leech warning.
- A struggling card leaves the list once its last 3 reviews are all `Good` or `Easy`; `Hard` and `Again` keep it listed. Resetting a card's review progress clears its lapses.
- Struggling cards load on demand when the mode is entered; they are global to the user and are not filtered by the selected subject scope or search. The list shows the most-lapsed cards first, capped at 50.
- While in refine mode the manage area shows the struggling cards as table rows with their lapse count and an "Improve" action, and the toolbar shows the struggling count plus `Refresh Refine` and `Exit Refine` actions.
- "Improve" asks the AI for a rewritten back, shown as a before/after diff the user can accept or discard.
- Legacy `view=refine` URLs fall back to the review view.

### Focus Mode

- Full-screen, distraction-free review experience optimized for mobile.
- Due-card review sessions are focus-only and start from the `Start review` action card on the review hub.
- Hides the left menu and all non-essential UI elements.
- Shows progress bar, card content, and rating buttons only.
- Shows a card actions menu for copy, edit, reset review progress, and delete.
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

### Global Search

- Search notes, flashcards, and mindmaps by text with case- and accent-insensitive matching ("funcao" finds "Função"). Subjects have no page, so they are not search results; notes and mindmaps also match on their subject's name.
- Flashcard search results navigate to the flashcard detail page.
- Flashcard search results display subject paths using `::` notation.
- Search is user-scoped and accessible from the left menu (and the `Cmd/Ctrl+K` shortcut).
- Empty search returns user data without text filtering, capped by configured result limits.
- Search results are cached on the client and invalidated after related mutations.
- Search result text matching the query (ignoring case and accents) is highlighted in results, with matched phrases kept centered in preview snippets. Standard light and dark themes use the warning highlight color; custom themes use theme-native highlight colors. Highlighting is rendered safely without raw HTML injection.
- Empty queries show unfiltered data without highlighting.

### Study Assistant

- When AI env vars are configured, every authenticated page shows a round assistant launcher in the bottom-right corner; without AI it is hidden. It opens one global collapsible sidebar on the right. Desktop layouts reserve space beside page content, full-screen review, and flashcard dialogs; on mobile it covers the page until minimized. The same conversation, open state, and unsent composer text follow client-side navigation and movement into/out of review and flashcard editors. Minimizing keeps the conversation.
- The assistant answers study questions: explaining concepts, worked examples and practice problems, checking reasoning, summarizing pasted material, quizzing, and study-technique advice. It replies in the user's language, with lists, code blocks, and LaTeX math rendered once a reply finishes streaming.
- General-knowledge and curiosity questions ("What is a cat?") count as study questions, and ambiguous requests are answered. Requests that are not about learning (casual chat, entertainment, shopping, news, personal advice, unrelated tasks), attempts to override its instructions, and harmful requests are refused with a fixed reply. The scope is enforced by the system prompt; there is no separate classifier.
- A "Hints first" toggle in the panel header is on by default, and the user's choice is remembered across reloads (a cookie on this browser). While on, practice problems, exercises, quiz questions, and unrevealed review or exam cards get graduated tutoring instead of the answer first: each reply gives one hint and invites an attempt (a guiding question, then the key concept or first step, then a worked step), checking each attempt and pointing out the first mistake. Wrong attempts are called wrong plainly, not "close". Hints never block the answer: asking for it ("just tell me") gets the full solution immediately, as does staying stuck after hints. Concept explanations, summaries, and study advice are answered directly, and requests to add, write, or change content (for example "add a formula here") are carried out without hints. Turning it off makes the assistant solve problems right away. The mode is sent with each message; it never reveals a hidden card answer either way.
- Replies stream in and can be stopped. `Enter` sends and `Shift+Enter` inserts a newline.
- Chats are not persisted: collapsing the panel keeps the conversation, a reload or "New chat" clears it.
- A message holds at most 4000 characters, and only the newest 20 messages are sent as context. Each sent message counts against a per-user daily limit (300). Failures, including the daily limit, show inline with a Retry action.
- Asked to make flashcards, the assistant proposes up to 5 per reply as cards in the chat showing front, back, and an optional code example in its own section (appended to the back as a code block on create), using concise retrieval practice (a short, direct question on the front such as "What is X?" or "What is the difference between X and Y?", one sentence or 1 to 3 bullets on the back; examples only when asked), with a subject preselected from the user's subject names (the user can change it; Create stays disabled until a subject is chosen). Each card offers Create, Edit (opens the Create Flashcard dialog prefilled), and Discard. Nothing is saved until the user clicks Create or saves the dialog; created cards follow the normal flashcard validation and limits. A handled card collapses to a "Flashcard created" or "Discarded" line. Cards still open when the user sends another message collapse to a "Skipped" line with a Restore action that reopens the card. Every outcome (created, discarded, or skipped) reaches the assistant with the next message. Handling a card does not send a message or count against the daily limit. Code examples are short, runnable as written (data first, then the query and its result as a comment), and chosen to show what sets the concept apart; cards on related concepts share one dataset, and the assistant may add one contrast card when the user asks to compare or does not fix a number of cards.
- While a flashcard editor is active, each chat request automatically includes the current unsaved front, back, and selected subject path, including incomplete drafts. A visible indicator identifies this context. Images are represented by opaque placeholders, and existing image references are preserved when suggestions are applied. The active editor takes priority over other study context.
- Draft context is background, not permission to edit. Study questions (for example, "what is alpha^2?"), explanations, and requests for examples are answered in chat even with an editor open. Only an explicit request to change the current card triggers edit proposals; earlier editing requests do not carry over to later questions. When asked to improve the current draft, the assistant proposes front and/or back replacements directly in those inputs. Math in suggestions is normalized into editor math nodes, including dollar-delimited LaTeX in HTML or plain-text output; code and currency stay literal. Targeted additions such as legends preserve existing formulas and use compact lists without spacer paragraphs. Added text is highlighted and removed text struck through. Each field has its own Accept and Discard controls; there are no approval cards in chat. Accept changes the draft and runs normal validation; Discard keeps the original field. Save/Create stays disabled until every suggestion is resolved. Inline detail editing resumes normal auto-save once review is resolved.
- Suggestions never overwrite newer typing or cross draft sessions: closing, switching, resetting after creation/saving, or editing during a reply invalidates stale suggestions. Follow-up requests skip unresolved suggestions and use the latest draft. A blocked or oversized send preserves pending suggestions. When a reply proposes multiple edits, each later proposal supersedes the previous one, recording unresolved fields as skipped. Outcomes reach the assistant on the next message without spending another AI request. Chat never saves edits itself.
- Review and exam messages include the current card front, subject, and answer. Before reveal the answer is marked hidden: the assistant uses it only to keep hints and attempt checks correct, and states it only when the user asks for the answer. It never echoes the raw context. The indicator reads "answer hidden" until reveal. If the user messages the assistant about a card before revealing it, the revealed answer shows a short note suggesting Hard or Again when the help aided recall; grading stays the user's choice. Card changes, undo, and exit refresh or clear that context. Without an active flashcard editor, requests to edit a review or exam card direct the user to open Edit first.
- Open notes and mindmaps provide their current unsaved title, subject, and content. Notes provide complete rich-text blocks with ephemeral references; mindmaps provide node labels, hierarchy, and directed cross-connections without positions or image URLs. Selected note blocks or the cursor region and selected map branches take priority, followed by document order or root-first graph traversal. Document excerpts are capped at 12,000 characters and identified as partial when content is omitted. A visible indicator names the active context. The assistant remains accessible in note and mindmap zen mode. Editor overlays restore underlying context on close; navigation clears old registrations.
- Explicit requests to edit the open note or mindmap preview inside the document itself, with one Accept changes / Discard changes pair resolving the whole proposal; notes show added text highlighted and removed text struck through (and a suggested title beside the original), and the chat shows only the resolved outcome. An explicit request such as "add a formula here", including short follow-ups in any language such as "add that too" or "put some examples", goes straight to a preview at the most relevant spot instead of a chat answer asking for confirmation. Chat answers do not end by offering to add their content to the document. Ordinary study questions still receive chat answers. Notes support title changes, replacing or deleting contiguous visible blocks, and inserting at visible block boundaries. Mindmaps support adding, renaming, removing, and moving branches, restyling non-root nodes (theme color, bold, italic; color names resolve through the hue each color slot shows in the user's current theme, and a color the theme lacks is reported rather than guessed), and adding, updating, or removing cross-connections; renaming the root updates the title. Mindmap proposals preview on the canvas in each node's final look with a state badge (Added, Changed, Moved, Restyled, Removed), re-laid out by measured size so suggested nodes never overlap; accepted changes re-lay out the same way. Over-escaped LaTeX commands in proposed labels (`\\frac`) are normalized. Root deletion/reparenting, hierarchy cycles, unseen references, overlapping note edits, invented attachments, and removal of incompletely visible subtrees are rejected.
- Document proposals preserve content outside their explicit targets, including unseen content and existing images and formatting. Accept changes updates the live editor in one undoable step (including title changes) and uses normal autosave; the chat never writes directly. Preview and Discard leave document content unchanged. Image uploads block accepting changes. Save failures retain the editor content and use its existing error/retry behavior.
- Proposals bind to the document session and persisted-content revision. New typing or graph changes invalidate older proposals, while selection and viewport changes do not. Follow-ups, navigation, and editor teardown skip unresolved proposals; new chat clears them and ignores late replies. Accepting a proposal twice has no effect. Outcomes reach the model on the next message without another AI request.
- Context is captured only when sending or retrying a message, using already loaded content without background AI calls or additional database reads. Beyond library search (below), the assistant has no access to other documents and changes nothing without the user's click. Existing conversation history remains across navigation.
- Asked whether the user has material on something ("do I have a flashcard on mitosis?", "which note talks about the Calvin cycle?"), the assistant searches the user's own notes, flashcards, and mindmaps once per reply. It sends 1 to 4 short terms (the topic plus synonyms or translations it picks); matching ignores case and accents and tolerates small typos in titles and flashcard fronts, but does not match by meaning. The search returns at most 4 items per kind with short excerpts (titles and excerpts up to 120 characters; card backs can appear in excerpts), never whole documents, and the chat lists each match as a link to its note, flashcard, or mindmap. On mobile, opening a link minimizes the chat. The assistant answers briefly from the excerpts and does not repeat the links. A search runs inside the same message and daily limit; a failed search shows "Library search failed." and the assistant answers without it.

### Command Palette

- Pressing `Ctrl`/`Cmd+P` opens a command palette for running actions and navigating, separate from Global Search (`Ctrl`/`Cmd+K`). The browser print shortcut is suppressed while the palette is available.
- Commands are searchable by name and keyword and grouped as Create, Go to, and Settings.
- Create commands open the existing create dialogs: Subject, Flashcard, Note, and Mindmap.
- Creating a Note or Mindmap requires a subject: the create dialog preselects the current subject on note and mindmap pages, otherwise the user chooses a subject in the dialog. The subject picker can create a subject inline, including a nested `::` path, and selects it automatically. Created notes and mindmaps navigate to their detail page.
- Go to commands navigate to Home and Flashcards.
- Settings commands switch the theme (Light, Dark, System), open the account settings dialog, and open the keyboard shortcuts help dialog.
- The palette hotkey is suspended while another dialog is open.

### Keyboard Shortcuts Help

- Pressing `?` outside an editable field opens a keyboard shortcuts dialog.
- The dialog lists every shortcut grouped by where it applies: Global, Notes editor, Mindmap, and Flashcard review.
- Groups whose shortcuts are usable on the current page are highlighted at the group level (accented card and header with a "This page" badge); individual rows keep uniform styling. Global is always highlighted.
- It includes typed triggers alongside key chords: `/table` and `/math` slash commands, inline `$...$` math, and pasted `$$...$$` block math.

### Account

- Account settings open in a dialog (not a route), reachable from the account menu ("Settings") and the "Open Settings" command. The dialog has a left sidebar of sections (Account, Appearance, Flashcards) and renders the active section on the right; its data is fetched lazily when the dialog opens.
- The sidebar has a search box; typing filters individual settings rows across every section into one flat list (matching row labels and keywords), replaces the content heading with the quoted query, and swaps the section list for a "Clear Search" control. Clearing the search restores the section list.
- A `?settings=<section>` query parameter on any app page opens the dialog to that section once on load, then strips the parameter from the URL.
- View account details and update display name.
- View flashcard optimization status, including the last FSRS optimization date.
- Reset flashcard optimization to default FSRS tuning while keeping review history.
- Admin-only access management page to approve, block, or set pending for users (separate `/admin` route).
- Delete account and all user-owned data.

### UI/UX Baseline

- Responsive layout for desktop and mobile.
- The left menu holds the account menu, Search, the global section links (Home, Flashcards), and the subject tree. On launch and after login the user lands on the Home dashboard (`/`); signed-out users are sent to the login page. The Home dashboard greets the user and surfaces overview cards: flashcards due for review, a review-activity heatmap with study streaks, and recently edited documents (notes and mindmaps across all subjects). Subjects are managed in the sidebar tree, not on the dashboard. On desktop the menu can be collapsed via a toggle in its header; while collapsed a floating button restores it, and the collapsed state persists across reloads. On mobile it opens from a top "Menu" sheet instead.
- Every page shows a sticky top bar with a breadcrumb (e.g. `Subject > Note` or `Flashcards > Biology::Cells`) that indicates the current location and replaces per-page "Back to …" links. It holds at most a parent crumb (linked when it has a page; subjects do not) and the current page as the unlinked final crumb. A note named like its subject still shows both crumbs.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Dialog mutation feedback follows a two-mode rule: **close on success** for straightforward create/edit dialogs (user sees the result appear in the list); **button saved state** (1200 ms "Saved ✓" transition on the submit button) for dialogs that stay open as a progress checkpoint, where the user continues working after saving (e.g. create flashcard, edit flashcard). Inline auto-save surfaces compact saving, saved, and error status near the edited content.
- Action confirmation dialogs use one shared layout and footer pattern. Reversible or non-destructive confirmations use the primary confirm button; irreversible delete/remove/discard confirmations use destructive styling.
- Theme toggle with `light`, `dark`, `halloween`, `catppuccin-mocha`, `gruvbox`, and `system`; authenticated users choose it from the Appearance card in account settings, and signed-out users access it from a floating top-right control.
- Installed PWA launch uses the static dark theme background before app code loads; browser and installed PWA chrome follows the active theme after the app loads, including custom themes.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 50 subjects.
- A user can create a maximum of 100 notes per subject.
- A user can create a maximum of 100 mindmaps per subject.
- A mindmap can have a maximum of 200 nodes.
- A user can create a maximum of 2000 flashcards per subject.
- A user can send a maximum of 300 study assistant messages per day.
- A user can make at most 500 AI back improvements per day. Flashcard proposals use the study assistant message limit.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, mindmaps, and flashcards.
- Account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `instance_state`
  - `id`, `initialAdminUserId`, `initialAdminAssignedAt`, timestamps
- `subject`
  - `id`, `name`, `parentSubjectId`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `subjectId`, timestamps, `userId`
- `flashcard_scheduler_settings`
  - `id`, `userId`, `desiredRetention`, `weights`, `optimizedReviewCount`, `automaticOptimizationEnabled`, optimization timestamps
- `flashcard_review_log`
  - `id`, historical `flashcardId`, historical `subjectId`, `userId`, `rating`, `reviewedAt`, `daysElapsed`, timestamps
- `note`
  - `id`, `title`, `content`, `subjectId`, timestamps, `userId`
- `mindmap`
  - `id`, `title`, `data` (JSON graph of nodes and edges), `subjectId`, timestamps, `userId`

## Out of Scope

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
