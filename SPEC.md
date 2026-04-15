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

### Subjects

- Create, read, update, and delete subjects.
- Archive and restore subjects.
- Subject fields: name and optional description.

### Notes

- Create, read, update, and delete notes per subject.
- Notes use rich text editing and rendering.
- Rich text supports headings, lists, quotes, inline code, syntax-highlighted code blocks, and other shared editor formatting exposed by the app.
- Note content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.

### Flashcards

- Create, read, update, and delete flashcards within decks.
- Flashcard fields: front and back rich text.
- Flashcard create and edit support AI generation of the back when the back is empty.
- AI flashcard generation is BYOK-only: each user configures their own OpenRouter model and API key on the account page.
- Flashcard rich text supports the same shared editor capabilities as notes, including syntax-highlighted code blocks and supported image rendering.
- Flashcard content renders images from:
  - pasted direct image URLs
  - pasted image uploads stored in private blob storage
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Flashcards have a global top-level page with review, management, and statistics views.
- The default flashcards page opens in the review view, with management and statistics available as alternate global views.
- Flashcards have a dedicated flat detail page at `/flashcards/[flashcardId]`.
- Flashcard review remains available in the global flashcards page.
- User AI API keys are encrypted at rest, never shown back to the user after saving, and excluded from data export/import.

### Decks

- Decks are global to the user and are not owned by subjects.
- Decks support unlimited nesting through `parentDeckId`.
- Deck paths use `::` notation for display and searchable pickers.
- Deck names must be unique among sibling decks, including root-level decks.
- Users can create, rename, and delete decks from the flashcards area.
- Deleting a deck also deletes its child decks and all flashcards inside that subtree.
- The flashcards page uses a deck tree sidebar, and deck-scoped review/manage/statistics include cards from descendant decks.
- When creating or editing a flashcard, the user must choose one of their decks.

### Flashcard Review

- Global review page with a spaced repetition queue.
- Review view is a landing hub with `Start review` and `Start exam` action cards.
- Review answers are `Again`, `Hard`, `Good`, and `Easy`.
- Review uses a memory-state scheduler with learning and relearning stages.
- Review logs are stored per user.
- Review parameters support per-user tuning.
- Keyboard shortcuts on the review screen:
  - `Enter` reveals the back when hidden.
  - `Enter` grades `Good` after the back is shown.
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
- Subject detail pages show a minimal assessment summary with the subject average when available and a link to the planning page filtered to that subject.
- The planning assessments view always shows a combined grade/weight column, and enters a subject-focused mode when exactly one subject is selected to additionally show the final grade summary for that subject.
- Assessment fields: title, optional description, type, status, due date, optional score, and optional weight.
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

### Account

- View account details.
- Navigate Account settings sections with in-page shortcuts on the Account page.
- Update display name.
- Admin-only access management page to approve, block, or set pending for users.
- Export study data as JSON, including subjects, notes, attendance, assessments, flashcards (with deck assignment), decks, and flashcard review settings.
- Export template JSON with subject structure only, excluding notes, attendance records, flashcards, and all account/security data.
- Import user data from a previous Notorium export.
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
- The "Email Notifications" preferences card is hidden on the Account page when `RESEND_API_KEY` is not configured, and notification preferences are not queried from the database.

### UI/UX Baseline

- Responsive layout for desktop and mobile.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Theme toggle with `light`, `dark`, `tokyo-night`, `halloween`, `catppuccin-mocha`, `catppuccin-latte`, and `system`; authenticated users access it from the navbar, and signed-out users access it from a floating top-right control.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 50 subjects.
- A user can create a maximum of 100 notes per subject.
- A user can create a maximum of 50 assessments per subject.
- A user can create a maximum of 2000 flashcards per deck.
- A user can create a maximum of 200 decks.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, flashcards, attendance records, and assessments.
- Data export, import, and account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `instance_state`
  - `id`, `initialAdminUserId`, `initialAdminAssignedAt`, timestamps
- `subject`
  - `id`, `name`, `description`, `totalClasses`, `maxMisses`, timestamps, `userId`
- `deck`
  - `id`, `name`, `description`, `parentDeckId`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `ease`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `deckId`, timestamps, `userId`
- `flashcard_scheduler_settings`
  - `id`, `userId`, `desiredRetention`, `weights`, `optimizedReviewCount`, optimization timestamps
- `flashcard_review_log`
  - `id`, `flashcardId`, `userId`, `rating`, `reviewedAt`, `daysElapsed`, timestamps
- `note`
  - `id`, `title`, `content`, `subjectId`, timestamps, `userId`
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
