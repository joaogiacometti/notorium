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

### Localization

- Full product localization in English (`en`) and Portuguese (`pt`).
- All user-facing copy must exist in both locale dictionaries with aligned key paths.
- Locale-aware routing is required for all app pages.

### Authentication

- Email/password sign up, sign in, and sign out.
- Session-based access control across the app.
- New accounts start with pending access status.
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
  - supported Imgur share links
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.

### Flashcards

- Create, read, update, and delete flashcards per subject.
- Flashcard fields: front and back rich text.
- Flashcard create and edit support AI generation of the back when the back is empty.
- AI flashcard generation is BYOK-only: each user configures their own OpenRouter model and API key on the account page.
- Flashcard rich text supports the same shared editor capabilities as notes, including syntax-highlighted code blocks and supported image rendering.
- Flashcard content renders images from:
  - pasted direct image URLs
  - supported Imgur share links
  - Markdown image syntax
- Unsupported relative or local media references degrade to plain text instead of rendering as images.
- Flashcards have a global top-level page with a management view and a review view.
- The default flashcards page opens in the review view, with management available as the alternate global view for filtering, finding, and editing across subjects.
- Flashcards have a dedicated detail page nested under subject routes.
- Flashcard review remains available as the second view in the global flashcards page.
- Flashcard imports support importing Anki `.txt` exports into a selected subject.
- Supported scheduling metadata from Anki imports is preserved when present.
- User AI API keys are encrypted at rest, never shown back to the user after saving, and excluded from data export/import.

### Flashcard Review

- Global review page with a spaced repetition queue.
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

### Attendance

- Configure `totalClasses` and `maxMisses` per subject.
- Record and delete misses by date.
- Show progress, remaining misses, and attendance rate.

### Assessments

- Create, read, update, and delete assessments per subject.
- Assessment fields: title, optional description, type, status, due date, optional score, and optional weight.
- Pending, overdue, and completed states are shown in the UI.
- Subject average from completed assessments with score:
  - weighted average if at least one valid weight exists
  - simple average otherwise

### Global Search

- Search subjects, notes, and flashcards by text with case-insensitive matching.
- Flashcard search results navigate to the flashcard detail page.
- Search is user-scoped and accessible from the navbar.
- Empty search returns user data without text filtering, capped by configured result limits.
- Search results are cached on the client and invalidated after related mutations.

### Profile

- View account details.
- Update display name.
- Admin-only access management page to approve, block, or set pending for users.
- Export study data as JSON, including subjects, notes, attendance, assessments, flashcards, and flashcard review settings.
- Export template JSON with subject structure only, excluding notes, attendance records, flashcards, and all account/security data.
- Import user data from a previous Notorium export.
- Delete account and all user-owned data.

### UI/UX Baseline

- Responsive layout for desktop and mobile.
- Loading states and skeletons.
- Toast feedback for mutation success and error states.
- Theme toggle with `light`, `dark`, and `system`.
- Custom not-found page.

## Resource Limits

- A user can create a maximum of 20 subjects.
- A user can create a maximum of 30 notes per subject.
- A user can create a maximum of 15 assessments per subject.
- A user can create a maximum of 500 flashcards per subject.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, flashcards, attendance records, and assessments.
- Data export, import, and account deletion operations must enforce ownership checks server-side.

## Main Entities

- `user`
  - `id`, `name`, `email`, `accessStatus` (`pending` | `approved` | `blocked`), `isAdmin`, timestamps
- `subject`
  - `id`, `name`, `description`, `totalClasses`, `maxMisses`, timestamps, `userId`
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `stability`, `difficulty`, `ease`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `subjectId`, timestamps, `userId`
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
