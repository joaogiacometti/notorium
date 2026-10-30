# Notorium — Product Specification

## Document Scope

- This file is the source of truth for current product behavior, UX rules, feature constraints, and acceptance criteria.
- Keep it stable and concise.
- Do not use this file for contributor workflow, coding conventions, setup instructions, or deployment steps.
- Do not track future ideas, refactor history, or bug-fix history here.

## Product Goal

Notorium helps people learn: producing, reviewing, and asking about study material with AI, through notes, flashcards, spaced-repetition review, and fast personal search. It is not a school management system.

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
- Subjects are folders: they hold notes, PDFs, flashcards, and subfolders, and are managed entirely in the sidebar tree. A folder icon marks each subject; clicking its label expands or collapses it like the chevron (subjects with no subfolders or documents have nothing to expand, so their label stays inert). Subjects have no page of their own; visiting `/subjects/[id]` directly redirects home.

### Documents

- Each subject has a Documents area that holds its notes and PDFs.
- Document navigation lives in the global subject tree sidebar (the app frame): expanding a subject lists its notes and PDFs, so document detail pages have no in-page documents sidebar and the editor spans the full content width. While a subject's documents load, the expanded subject shows a loading row; if loading fails, that row becomes "Couldn't load documents." with a Retry action instead of spinning forever, and collapsing and re-expanding the subject also retries.
- Each note row in the tree sidebar has a kebab menu with the same actions as its detail-page header menu, working without opening the note, plus Rename (changes the title in a dialog): Rename, Copy as rich text, Copy as plain text, and Delete. A PDF row offers Rename and Delete. These act on the document's last saved state; renames and deletes refresh the subject's rows in place.
- Document row management (rename, delete, copy) happens through the subject tree sidebar's kebab menus. The sidebar remains the persistent navigator.
- The tree sidebar supports drag-and-drop reorganization. A subject (including a subsubject) can be dragged onto another subject to become its child, or onto the "Move to top level" zone to become a root subject; that zone only appears while dragging a nested subject, since root subjects are already top level. A subject cannot be dropped onto itself, its current parent, or one of its own descendants. A note or PDF can be dragged onto any subject to move it under that subject; documents cannot be dropped on the top-level zone (every document belongs to a subject) or onto the subject they already belong to. Concurrent subject moves for the same user are serialized so overlapping moves cannot create a hierarchy cycle. Moves are rejected when the destination would exceed its note or PDF limit, and the dragged row shows a spinner while the move is in flight. The destination branch expands to reveal the moved item.
- Each subject's sidebar kebab menu offers Subfolder directly and Add note and Add PDF under a Documents submenu (flashcard actions sit under a Flashcards submenu); each prompts for a title (Add PDF also for the file) and opens the new item. Rename changes the subject's name in a dialog.
- Note and PDF detail pages offer a zen mode toggle next to the document actions menu. Zen mode expands the editor or reader to a full-screen, distraction-free view that hides the breadcrumb bar while keeping the title and document actions available. `Escape` or the toggle exits; an `Escape` that closes a dialog or menu does not also exit zen mode.

#### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, tables, LaTeX math, and other shared editor formatting exposed by the app. A compact toolbar exposes headings, inline formatting, lists, quotes, code blocks, links, tables, and image uploads, with active-format state and keyboard-focus tooltips; it wraps onto a second row instead of scrolling when space is short. The toolbar is not a Tab stop, so Tab moves between fields and straight into the text; Alt+F10 from the text moves into the toolbar, arrow keys/Home/End move within it, and Tab returns to the text.
- Math renders with KaTeX in both editing and reading. Inline math is typed as `$...$`; the `/math` slash command inserts a block equation. Equations are editable by clicking them, and their LaTeX stays searchable.
- Note detail edits the active note inline with auto-save across the full content width. The header kebab (three-dot) menu offers Copy as rich text, Copy as plain text, and Delete; there is no Edit action because the title and content are already edited inline.
- Note detail supports copying note content as rich text or plain text.
- Note content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Image uploads accept files up to 4 MiB. Authenticated upload attempts (including invalid or oversized requests) count toward the 200-per-day allowance, checked before reading the body. The total multipart body is capped at 4 MiB plus 64 KiB of overhead; oversized uploads return a size-limit error.
- Uploaded note and flashcard images are automatically optimized to WebP on upload, with a maximum dimension cap, to reduce stored size and bandwidth without a visible quality loss. The original is kept only if optimization would not make the file smaller.
- When AI is configured, users can ask the study assistant to propose flashcards using the open note’s current content, then review and create them in chat.

#### PDFs

- Users upload PDF files (books, articles) to a subject and read them in the app on phone and desktop. Annotations, highlights, and two-page spreads are not supported.
- Add PDF opens a dialog with a file picker and a title that defaults to the file name without its extension. Only PDF files up to 100 MB are accepted; the upload shows progress and goes straight from the browser to private blob storage, then the new PDF opens. Starting an upload counts toward a 50-per-day allowance.
- The reader shows pages in one continuous vertical column, sized to Page fit by default, so a whole page is visible (on a phone this fits the page to the screen width). Only pages near the viewport are rendered, and the file is fetched in byte ranges, so large books open without downloading the whole file.
- Zoom is shown as a percentage of the page's actual (printed) size and ranges from 25% to 400%: the − and + buttons step by 25%, the percentage button opens the presets Page fit, Page width, and Actual size, and pinch (touch) or Ctrl/⌘ + scroll wheel (mouse, trackpad pinch) zoom the PDF instead of the page. Zooming and resizing keep the reader on the same spot of the same page.
- The toolbar shows the current page and page count with previous and next page buttons; typing a page number jumps to that page.
- The reader remembers the last page read (only the page, not the position within it) and reopens there. Saving the page does not change the document's recency in lists.
- The PDF header kebab menu offers Rename, Download, and Delete. Deleting a PDF removes it from the app; its stored file is removed by the scheduled orphan sweep.

### Flashcards

- Create, read, update, and delete flashcards within subjects.
- The flashcards manage table supports selectable page sizes of 10, 25, 50, 100, 250, or 500 rows, persisted in the URL.
- Flashcard manage search ignores case and accents, and ranks front matches before back matches, subject-name matches, and recency tie-breakers.
- The manage toolbar `Study later` filter chip, beside the result count, narrows the table to cards marked study later, persisted in the URL as `?filter=studyLater`; the table rows carry no study-later marker, and each row's actions menu toggles the mark.
- The manage toolbar `Struggling` filter chip, next to `Study later`, narrows the table to struggling cards (leeches), persisted in the URL as `?filter=struggling`. It is available with or without AI. The two filters are mutually exclusive: selecting one replaces the other, and selecting the active one clears it. Like the other filters it composes with the subject scope, search, and pagination; without a search it lists the most-lapsed cards first, and each row shows its lapse count.
- A struggling card has lapsed (been forgotten after graduating) at least 4 times, matching Anki's first leech warning, and stops counting once its last 3 reviews are all `Good` or `Easy`; `Hard` and `Again` keep it listed. Resetting a card's review progress clears its lapses. There is no dedicated AI action for struggling cards: users open a card and ask the study assistant to improve or explain it.
- Flashcard fields: front and back rich text.
- Flashcard fronts must be unique per user across subjects after the existing rich-text normalization. Duplicate fronts are rejected by the database when saving; typing triggers no duplicate checks and Save does not wait for one. Flashcard editors show save-time duplicate errors inline, preserve the draft, and clear the error when the front changes so the user can retry.
- Flashcards proposed while a note is active retain that document as their source when created directly or through the create dialog the proposal's Edit opens. The source is captured with the request, so later navigation does not change older proposals. Cards requested without document context have no source; sources are not inferred from chat history or library search.
- A card with a source shows one consistent "From <document title>" link, with a note icon, as muted header metadata: under the subject heading in card detail, and on the subject row in review/exam after answer reveal or while editing the card there. Session links open a new tab so unsaved edits and session progress are kept. Links use the document's current title and subject, following renames and moves. Editing, moving, or resetting a card preserves its source. Deleting a source removes the link while keeping the card; existing cards remain without sources.
- The New flashcard dialog opens with focus on the dialog itself, never on a field or editor toolbar button, so no focus ring or tooltip appears on open; Tab starts at the first field.
- Starting another save in a flashcard dialog clears the previous "Saved" confirmation, so a failed retry cannot retain success feedback.
- Source references are validated and ownership-checked on creation; users cannot attach another user's document.
- The flashcard editor (create dialog, detail page, and inline review editing) uses the study assistant for conversational improvements and filling an empty back; there are no separate Generate/Improve with AI buttons in these editors.
- AI flashcard creation uses the study assistant, including requests based on an open note. Document menus have no dedicated generation actions.
- Generated AI flashcards test one assessable recall target in the requested direction, with a specific, unambiguous cue that does not reveal the answer. A coherent contrast, causal relationship, or bounded process may be one target; independently forgettable targets are not bundled under one grade. Backs are minimalist, precise, and complete: compact bullets by default, a short phrase for a genuinely single-fact answer, or numbered steps when order matters. Lead with the direct response and retain essential conditions, negation, units, uncertainty, and causal links; omit headings, filler, and redundant wording, not meaning. Usually include one brief example that clarifies the same target as optional explanatory support, preferably in a final bullet; omit redundant, forced, unsupported, or explicitly unwanted examples. Reliable general-knowledge illustrations must not masquerade as source facts. Work within the requested count, choosing the central target for one card rather than adding cards. Preserve source meaning, but follow the user's requested language. Targeted edits apply these principles only within the requested change and preserve unrelated content.
- AI generation may emit LaTeX math (`$...$` inline, `$$...$$` block), which is converted to rendered math nodes.
- AI output follows the most recent applicable explicit output-language instruction within its task or conversation scope; otherwise it follows the latest user's own request language, including brief confirmations, corrections, and follow-ups whose wording identifies a language. Only ambiguous or language-neutral requests inherit language from earlier user messages. This applies to chat (including refusals) and assistant-written card prose regardless of resource language; source text, subject names, application labels, and previous assistant replies do not select it. Code identifiers, intentional quotations, and content whose language is itself being studied remain intact, as does unrelated content during targeted edits.
- AI flashcard generation is optional and configured globally at the instance level with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
- AI flashcard controls are hidden when AI env vars are not configured.
- AI assistant use is limited per approved user per day.
- Flashcard rich text supports the same shared editor capabilities as notes, including syntax-highlighted code blocks, LaTeX math, and supported image rendering.
- Flashcard content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Flashcards have a global top-level page with review and management views.
- The default flashcards page opens in the review view, with management available as an alternate global view.
- Flashcards have a dedicated flat detail page at `/flashcards/[flashcardId]`. Its header mirrors the note page: the subject path as the title row beside the actions menu, with the source link under it when the card has one; it does not show creation time. Front and Back edit with auto-save in the shared flashcard editor.
- Every flashcard is edited in one editor: Front stacked over a tinted Back, laid out like the review card, under a single formatting toolbar that follows the focused side and stays pinned while a long card scrolls. Each side grows with its content, so the surrounding page, dialog, or session scrolls instead of the fields. The detail page, the New flashcard dialog, and review/exam sessions all use it. There is no Edit Flashcard dialog: clicking a manage table row opens the detail page (the row actions menu has no Edit item), and Edit in review/exam (`e`) turns the current card into the editor in place, with Cancel and Save (Ctrl/Cmd+Enter) in the session footer and Escape to cancel, so the assistant sidebar stays usable while editing.
- The New flashcard dialog has the subject picker, the flashcard editor, and a footer with "Keep front" and "Keep back" checkboxes (which carry those fields into the next card) beside the Create button (Ctrl/Cmd+Enter). Its header holds the assistant launcher and the close button.
- Flashcards can be copied as Markdown for pasting into an AI chat or sharing with others. A single card copies from the manage table row menu, the detail-page header menu (with the content currently in its editors), or the review/exam session card actions menu; the manage toolbar's `Copy` action copies every selected row at once, in table order. Each card copies its subject path, front, and back; several cards get numbered `## Card N` headings separated by `---`. Rich text becomes Markdown (bold, italics, strikethrough, inline code, links, lists, task lists, code blocks, tables, and LaTeX math as `$...$`/`$$...$$`). Uploaded images are private to their owner, so they copy as `[Image]` placeholders; public image URLs copy as Markdown images. A toast confirms how many cards were copied or reports the failure, including when the cards no longer exist. The toolbar `Copy` action stays disabled with a spinner until every copy in progress finishes.
- Flashcard review remains available in the global flashcards page.
- Review and exam sessions are their own pages, `/flashcards/review` and `/flashcards/exam` (both accept `?subjectId`), so refresh, back, and deep links work. They hide the sidebar and page chrome. Review content scrolls within the session only when it exceeds the available screen space. The card area is the session's only scroll region (card faces have no scrollbars of their own). Like Anki, each new card starts at its top, and revealing the answer of a card taller than the screen jumps the start of the Back to the top of the card area and holds it there while the answer finishes rendering, unless the user scrolls first. A scope with no due cards (review) or no cards (exam) redirects to the review hub.
- Legacy `view=refine` URLs fall back to the review view.
- In the flashcards manage toolbar, every icon-only action must show a descriptive tooltip on hover and keyboard focus instead of relying on icon recognition alone.

### Flashcard organization by subject

- Flashcards belong to a subject (`flashcard.subjectId`); there is no separate deck concept.
- Subjects already form the user's hierarchy (see Subjects); flashcards reuse it, so subject paths use `::` notation in display and searchable pickers, and review/manage scoped to a subject include cards from descendant subjects.
- There is no in-page flashcard tree. The flashcards page is two global surfaces — review everything and manage all flashcards — with a subject filter dropdown that scopes the current view via the `?subjectId` URL param.
- The global subject sidebar shows a per-subject "due" indicator counting cards due in that subject and its descendants with the same rule as the review queue (including the learn-ahead window below), refreshed after every flashcard write and, for review sessions, once the session is left after grading, when the review hub shows the same refreshed count; clicking the indicator opens the review session directly, scoped to that subject.
- Each subject's sidebar kebab menu has a "Review flashcards" entry that opens the review session page directly (scoped to that subject and its descendants, when cards are due; otherwise it lands on the review hub), and a "Manage flashcards" entry that opens the manage view pre-filtered to that subject.
- Flashcard creation from the manage toolbar is available before a subject exists because the create form can create one inline.
- When creating, editing, moving, or generating a flashcard, the user chooses one of their subjects. The new-flashcard and move-flashcards subject pickers let the user create a subject from the filtered list when their search does not exactly match an existing subject path (case-insensitive): a plain name creates a root subject, while a `::` path reuses any existing leading segments and creates the missing ones as nested subjects. The created subject is selected automatically, and `::` path searches show existing path patterns segment-by-segment so users can autocomplete nested subjects.
- Deleting a subject deletes its descendant subjects and all flashcards inside that subtree (alongside its notes).

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
  - `e` edits the current card in place.
  - `d` opens delete flashcard confirmation.
  - `u` undoes the last review while an undo is available (not in exam mode).
  - `l` marks the current card study later, or removes the mark.
  - `r` opens reset review progress confirmation for the current card.
  - `1` grades `Again` after reveal.
  - `2` grades `Hard` after reveal.
  - `3` grades `Good` after reveal.
  - `4` grades `Easy` after reveal.

### Review activity

- The Home dashboard shows a review-activity card with a heatmap of daily review counts over the last 365 days, rendered as a calendar grid whose cell intensity reflects how many reviews happened that day, plus current and longest day-streak counters derived from the same data. The current streak counts consecutive days with at least one review ending today, and a day with no reviews yet today does not break it.
- The heatmap and streaks aggregate every flashcard review for the user; the card shows an empty-state hint when there are no reviews in the last year.

### Study Later

- During a due review, users can mark the current card "Study later" from the card actions menu or with `l` when they cannot recall it clearly and have no time to study it now. Marking does not grade the card: it moves to the end of the queue and comes back after every other due card, where it is graded normally.
- Exam sessions offer the same menu item and `l`; there the mark only saves for future due reviews, and the exam keeps its order and current card.
- Due cards marked study later are always queued after unmarked due cards, across batches and reloads, in every review session until the mark is removed. Marking does not change which cards are due or the card's schedule.
- The review, manage-row, and card detail actions menus show `Study later` as a checkable item, checked while the card is marked; selecting it toggles the mark. The mark stays until the user removes it there; grading or resetting a card keeps it. A marked card shows a muted "Study later" label in review and exam sessions.
- The manage view lists marked cards through its `Study later` filter (see Flashcards).

### Review Session

- Distraction-free review page at `/flashcards/review`, optimized for mobile. The home "Flashcards due" card's `Review now` link opens it directly.
- Starts from the `Start review` link on the review hub, the home card, or the sidebar; reloading keeps the session and resumes the remaining due cards.
- Hides the left menu and all non-essential UI elements.
- Shows progress bar, card content, and rating buttons only.
- Shows a card actions menu for study later, copy, edit, reset review progress, and delete.
- Keyboard shortcuts:
  - `Escape` exits the session.
- Exiting waits for in-flight grade saves, then returns to the review hub with the same subject scope. The completion screen provides the same exit.

### Exam Mode

- Accessed from the flashcard review hub via the `Start exam` link, which opens `/flashcards/exam`.
- Uses the active subject filter as the exam scope.
- Exam cards load with the page; progress is not saved, so reloading starts a fresh shuffled exam.
- Uses the review session layout with exam progress shown as `Card X of Y`.
- Exam sessions do not modify due-card scheduling state for regular spaced-repetition reviews.
- Exam completion provides a summary screen with a close action and retry-weak-cards action when applicable.

### Global Search

- Search notes and flashcards by text with case- and accent-insensitive matching ("funcao" finds "Função"). Subjects have no page, so they are not search results; notes also match on their subject's name.
- Flashcard search results navigate to the flashcard detail page.
- Flashcard search results display subject paths using `::` notation.
- Search is user-scoped and accessible from the left menu (and the `Cmd/Ctrl+K` shortcut).
- Search results are cached on the client and invalidated after related mutations.
- Search result text matching the query (ignoring case and accents) is highlighted in results, with matched phrases kept centered in preview snippets. Standard light and dark themes use the warning highlight color; custom themes use theme-native highlight colors. Highlighting is rendered safely without raw HTML injection.
- Before the user types, the dialog shows only commands and loads nothing. Notes and flashcards are searched only once the query reaches the search minimum (2 characters); until the first matches arrive a "Searching…" row stands in for results (never the empty message), and refining a query keeps the previous matches visible until the new ones load.

### Study Assistant

- When AI env vars are configured, the assistant launcher is a ghost icon button in each page's top bar (and in the review/exam session header, the New flashcard dialog header, and note zen mode); nothing floats over page content. It shows a selected state while the assistant is open. Without AI it is hidden. Cmd/Ctrl+J toggles the assistant from anywhere, including inside the chat. It opens one global collapsible sidebar on the right. Desktop layouts reserve space beside page content, review and exam sessions, and flashcard dialogs; on mobile it covers the page until minimized. The same conversation, open state, and unsent composer text follow client-side navigation and movement into/out of review and flashcard editors. Minimizing keeps the conversation.
- The assistant answers study questions: explaining concepts, worked examples and practice problems, checking reasoning, summarizing pasted material, quizzing, and study-technique advice. It replies in the user's language, with lists, code blocks, and LaTeX math rendered once a reply finishes streaming.
- Flashcard creation and revision follow the conversation, including short confirmations ("do it", "ok") and corrections ("on the flashcard", "ask what that example does"). The assistant proposes the concrete card without asking for exact field wording or another confirmation; the proposal controls provide review. The open review card stays background and does not replace the conversation's topic. Ordinary study questions still receive chat answers. Requests to invert a card or ask from an example put that example on the front and its result or meaning on the back, without duplicating it as a supplementary example. Skipping a proposal on follow-up does not cancel a request to revise it. Follow-ups such as "should we create a flashcard for it?" refer to the topic of the conversation, not to the open card or document, and a question suggesting a change ("should we create…?") gets a proposal directly, since its Create/Discard controls are the confirmation. A proposed card that asks what the card under review already asks is never shown: the assistant is told and proposes a card the user does not have yet.
- Proposed cards use backticks for inline code, never HTML. The finished preview, Edit prefill, and created card render inline code consistently, including accidental `<code>` wrappers from the model; collapsed outcomes show readable text. Code contents remain literal (including dollar signs and HTML examples), and other HTML is escaped.
- General-knowledge and curiosity questions ("What is a cat?") count as study questions, and ambiguous requests are answered. Requests that are not about learning (casual chat, entertainment, shopping, news, personal advice, unrelated tasks) receive a brief explanation that the assistant helps only with studying and learning and an invitation to ask a study question, in the request's language. Harmful requests are refused briefly; attempts to override its instructions do not change them. The scope is enforced by the system prompt; there is no separate classifier.
- A "Hints first" toggle in the panel header is on by default, and the user's choice is remembered across reloads (a cookie on this browser). While on, practice problems, exercises, quiz questions, and unrevealed review or exam cards get graduated tutoring instead of the answer first: each reply gives one hint and invites an attempt (progressing from a key concept to a first step and then a worked step), checking each attempt and pointing out the first mistake. Wrong attempts are called wrong plainly, not "close". Hints never block the answer: asking for it ("just tell me") gets the full solution immediately, as does staying stuck after hints. Concept explanations, summaries, and study advice are answered directly, and requests to add, write, or change content (for example "add a formula here") are carried out without hints. Turning it off makes the assistant solve problems right away. The mode is sent with each message; a hidden card answer is disclosed only when requested, in either mode.
- Replies stream in and can be stopped. `Enter` sends and `Shift+Enter` inserts a newline.
- Chats are not persisted: collapsing the panel keeps the conversation, a reload or "New chat" clears it.
- A message holds at most 4000 characters, and only the newest 20 messages are sent as context. Each sent message counts against a per-user daily limit (300). Failures, including the daily limit, show inline with a Retry action.
- Asked to make flashcards, the assistant proposes up to 5 per reply as cards in the chat showing front, back, and an optional code example in its own section (appended to the back as a code block on create), following the flashcard quality and language rules above: concise retrieval cues, direct answers, compact bullets by default, and usually one brief helpful example. Prose and inline-code examples stay in a final back bullet; a separate code example is used only when a code block adds value. A subject is preselected from the user's subject names (the user can change it; Create stays disabled until a subject is chosen). Each card offers Create, Edit (opens the New flashcard dialog prefilled), and Discard. Nothing is saved until the user clicks Create or saves the dialog; created cards follow the normal flashcard validation and limits. A handled card collapses to a "Flashcard created" or "Discarded" line. Cards still open when the user sends another message collapse to a "Skipped" line with a Restore action that reopens the card. Every outcome (created, discarded, or skipped) reaches the assistant with the next message. Handling a card does not send a message or count against the daily limit. Code examples are short, runnable as written with necessary definitions and data and a result comment, and chosen to show what sets the concept apart; the assistant respects the requested count (one card if unspecified) without adding unsolicited contrast cards.
- While a flashcard editor is active, each chat request automatically includes the current unsaved front, back, and selected subject path, including incomplete drafts. A visible indicator identifies this context. Images are represented by opaque placeholders, and existing image references are preserved when suggestions are applied. The active editor takes priority over other study context.
- Draft context is background, not permission to edit. Study questions (for example, "what is alpha^2?"), explanations, and requests for examples are answered in chat even with an editor open. Only a request to change the current card triggers edit proposals, including short follow-ups such as "do it" or "add it" referring to a change just discussed; earlier editing requests do not carry over to later study questions. When asked to improve the current draft, the assistant infers concrete wording and proposes front and/or back replacements directly in those inputs without another confirmation. The assistant sees and writes math as dollar-delimited LaTeX; suggestions are normalized into editor math nodes, an equation is never shown or saved empty, and code and currency stay literal. Targeted additions such as legends preserve existing formulas and use compact lists without spacer paragraphs. Added text is highlighted and removed text struck through. Each field has its own Accept and Discard controls; there are no approval cards in chat. Accept changes the draft and runs normal validation; Discard keeps the original field. Save/Create stays disabled until every suggestion is resolved. Inline detail editing resumes normal auto-save once review is resolved.
- Suggestions never overwrite newer typing or cross draft sessions: closing, switching, resetting after creation/saving, or editing during a reply invalidates stale suggestions. Follow-up requests skip unresolved suggestions and use the latest draft. A blocked or oversized send preserves pending suggestions. When a reply proposes multiple edits, each later proposal supersedes the previous one, recording unresolved fields as skipped. Outcomes reach the assistant on the next message without spending another AI request. Chat never saves edits itself.
- Review and exam messages include the current card front, subject, and answer. Before reveal the answer is marked hidden: the assistant uses it only to keep hints and attempt checks correct, and states it only when the user asks for the answer. It never echoes the raw context. The indicator reads "answer hidden" until reveal. If the user messages the assistant about a card before revealing it, the revealed answer shows a short note suggesting Hard or Again when the help aided recall; grading stays the user's choice. Card changes, undo, and exit refresh or clear that context. Without an active flashcard editor, requests to edit a review or exam card direct the user to open Edit first.
- Open notes provide their current unsaved title, subject, and rich-text blocks with ephemeral references. Selected blocks or the cursor region take priority, followed by document order. Excerpts are capped at 12,000 characters and identified as partial when content is omitted. A visible indicator names the active context. The assistant remains accessible in note zen mode. Editor overlays restore underlying context on close; navigation clears old registrations.
- Explicit requests to edit the open note preview inside the document itself, with one Accept changes / Discard changes pair resolving the whole proposal; additions are highlighted, removals struck through, and title suggestions appear beside the original. The chat shows only the resolved outcome. An explicit request such as "add a formula here", including short follow-ups, goes straight to a preview at the most relevant spot. Ordinary study questions receive chat answers. Notes support title changes, replacing or deleting contiguous visible blocks, and inserting at visible block boundaries. Unseen references, overlapping edits, invented attachments, copied or unchanged blocks, insertions without a target in a non-empty note, and outdated drafts are rejected; the assistant receives the reason and can correct its proposal within the same reply. Rejected edits remain hidden while the reply streams; only unanswered failures appear after it ends.
- Document proposals preserve content outside their explicit targets, including unseen content and existing images and formatting. Accept changes updates the live editor in one undoable step (including title changes) and uses normal autosave; the chat never writes directly. Preview and Discard leave document content unchanged. Image uploads block accepting changes. Save failures retain the editor content and use its existing error/retry behavior.
- Proposals bind to the document session and persisted-content revision. New typing or graph changes invalidate older proposals, while selection and viewport changes do not. Follow-ups, navigation, and editor teardown skip unresolved proposals; new chat clears them and ignores late replies. Accepting a proposal twice has no effect. Outcomes reach the model on the next message without another AI request.
- The assistant always has creation and library search available, plus only the editing tool supported by the current flashcard or note draft. Earlier tool calls and review outcomes remain in history when the active editor changes. Tool availability stays fixed across steps of one reply.
- Context is captured only when sending or retrying a message, using already loaded content without background AI calls or additional database reads. Beyond library search (below), the assistant has no access to other documents and changes nothing without the user's click. Existing conversation history remains across navigation.
- Asked whether the user has material on something ("do I have a flashcard on mitosis?", "which note talks about the Calvin cycle?"), the assistant searches the user's own notes and flashcards once per reply. It sends 1 to 4 short terms (the topic plus synonyms or translations it picks); matching ignores case and accents and tolerates small typos in titles and flashcard fronts, but does not match by meaning. The search returns at most 4 items per kind with short excerpts (titles and excerpts up to 120 characters; card backs can appear in excerpts), never whole documents, and the chat lists each match as a link to its note or flashcard. On mobile, opening a link minimizes the chat. The assistant answers briefly from the excerpts and does not repeat the links. A search runs inside the same message and daily limit; a failed search shows "Library search failed." and the assistant answers without it.

### Commands in Global Search

- The Global Search dialog (`Ctrl`/`Cmd+K`) also runs actions and navigates. Commands appear above note and flashcard results, including before the user types.
- Commands are searchable by name and keyword (case- and accent-insensitive) and grouped as Create, Go to, and Settings.
- Create commands open the existing create dialogs: Subject, Flashcard, and Note.
- Creating a Note requires a subject: the create dialog preselects the current subject on note pages, otherwise the user chooses a subject in the dialog. The subject picker can create a subject inline, including a nested `::` path, and selects it automatically. Created notes navigate to their detail page.
- Go to commands navigate to Home and Flashcards.
- Settings commands switch the theme (Light, Dark, System), open the account settings dialog, and open the keyboard shortcuts help dialog.
- The search hotkey is suspended while another dialog is open.

### Keyboard Shortcuts Help

- Pressing `?` outside an editable field opens a keyboard shortcuts dialog.
- The dialog lists every shortcut grouped by where it applies: Global, Notes editor, and Flashcard review.
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
- The left menu holds the account menu, Search, the global section links (Home, Flashcards), and the subject tree. On launch and after login the user lands on the Home dashboard (`/`); signed-out users are sent to the login page. The Home dashboard greets the user and surfaces overview cards: a flashcards-due row whose button starts the review (or browses flashcards when caught up), a full-width review-activity heatmap with study streaks, and recently edited notes across all subjects. Subjects are managed in the sidebar tree, not on the dashboard. On desktop the menu can be collapsed via a toggle in its header; while collapsed a floating button restores it, and the collapsed state persists across reloads. On mobile it opens from a top "Menu" sheet instead.
- Every page shows a sticky top bar with a breadcrumb (e.g. `Subject > Note` or `Flashcards > Biology::Cells`) that indicates the current location and replaces per-page "Back to …" links. It holds at most a parent crumb (linked when it has a page; subjects do not) and the current page as the unlinked final crumb. A note named like its subject still shows both crumbs.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Dialog mutation feedback follows a two-mode rule: **close on success** for straightforward create/edit dialogs (user sees the result appear in the list); **button saved state** (1200 ms "Saved ✓" transition on the submit button) for dialogs that stay open as a progress checkpoint, where the user continues working after saving (e.g. create flashcard). Inline auto-save surfaces compact saving, saved, and error status near the edited content.
- Action confirmation dialogs use one shared layout and footer pattern. Reversible or non-destructive confirmations use the primary confirm button; irreversible delete/remove/discard confirmations use destructive styling.
- Theme toggle with `light`, `dark`, `halloween`, and `system`; authenticated users choose it from the Appearance card in account settings, and signed-out users access it from a floating top-right control.
- Installed PWA launch uses the static dark theme background before app code loads; browser and installed PWA chrome follows the active theme after the app loads, including custom themes.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 50 subjects.
- A user can create a maximum of 100 notes per subject.
- A user can upload a maximum of 20 PDFs per subject, each up to 100 MB, and start at most 50 PDF uploads per day.
- A user can create a maximum of 2000 flashcards per subject.
- A user can send a maximum of 300 study assistant messages per day.
- Flashcard proposals use the study assistant message limit.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, PDFs, and flashcards.
- Account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `instance_state`
  - `id`, `initialAdminUserId`, `initialAdminAssignedAt`, timestamps
- `subject`
  - `id`, `name`, `parentSubjectId`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `studyLaterAt`, `subjectId`, timestamps, `userId`
- `flashcard_scheduler_settings`
  - `id`, `userId`, `desiredRetention`, `weights`, `optimizedReviewCount`, `automaticOptimizationEnabled`, optimization timestamps
- `flashcard_review_log`
  - `id`, historical `flashcardId`, historical `subjectId`, `userId`, `rating`, `reviewedAt`, `daysElapsed`, timestamps
- `note`
  - `id`, `title`, `content`, `subjectId`, timestamps, `userId`
- `pdf_document`
  - `id`, `title`, `fileName`, `blobPathname`, `sizeBytes`, `pageCount`, `lastPage`, `subjectId`, timestamps, `userId`

## Out of Scope

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
