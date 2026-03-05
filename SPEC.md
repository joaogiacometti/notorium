# Notorium — Product Specification

## How This File Works

- This file defines the current product behavior and constraints.
- Keep it stable and concise.
- Do not track future ideas, minor refactors, or bug-fix history here.

## Product Goal

Notorium helps students organize academic work in one place by combining subjects, notes, flashcards, attendance tracking, assessments, and fast personal search.

## Target Users

Students who want a private, lightweight study management workspace.

## Core Scope (Current)

### Localization

- Full product localization in English (`en`) and Portuguese (`pt`).
- All user-facing copy must exist in both locale dictionaries with aligned key paths.
- Locale-aware routing is required for all app pages.

### Authentication

- Email/password sign up, sign in, and sign out.
- Session-based access control across the app.

### Subjects

- Create, read, update, and delete subjects.
- Archive and restore subjects.
- Subject fields: name, optional description.

### Flashcards

- Create, read, update, and delete flashcards per subject.
- Flashcard fields: front and back text.
- Flashcards are displayed inline in subject detail in a collapsed section.
- Subject flashcards are loaded when the section is expanded.
- Flashcards have a dedicated detail page nested under subject routes.
- Global review page with spaced repetition queue.
- Review answers: Again, Hard, Good, Easy.
- Scheduler: SM-2-compatible defaults with learning/relearning stages.

### Notes

- Create, read, update, and delete notes per subject.
- Rich text editing and rendering for note content.

### Attendance

- Configure `totalClasses` and `maxMisses` per subject.
- Record and delete misses by date.
- Show progress, remaining misses, and attendance rate.

### Assessments

- Create, read, update, and delete assessments per subject.
- Assessment fields: title, optional description, type, status, due date, optional score, optional weight.
- Pending/overdue/completed states in UI.
- Subject average from completed assessments with score:
  - Weighted average if at least one valid weight exists.
  - Simple average otherwise.

### Global Search

- Search subjects, notes, and flashcards by text (case-insensitive).
- Flashcard search results navigate to the flashcard detail page.
- Search is user-scoped and accessible from navbar.
- Empty search returns user data without text filtering (capped by configured result limits).
- Search results are cached on the client and invalidated after related mutations.

### Profile

- View account details.
- Update display name.
- Export all user data as JSON (subjects, notes, attendance, assessments, flashcards) on paid plans (`pro`, `unlimited`).
- Export template JSON with subject structure only (excludes notes, attendance records, and flashcards) on paid plans (`pro`, `unlimited`).
- Import user data from a previous Notorium export on paid plans (`pro`, `unlimited`).
- Delete account and all user-owned data.

### UI/UX Baseline

- Responsive layout for desktop/mobile.
- Loading states/skeletons.
- Toast feedback for mutation success/errors.
- Theme toggle (light/dark/system).
- Custom not-found page.

## Plans

- **Free** (default): up to 5 subjects, up to 5 notes per subject, up to 5 assessments per subject, no flashcards.
- **Pro**: up to 20 subjects, up to 30 notes per subject, up to 5 assessments per subject, up to 500 flashcards per subject.
- **Unlimited**: no restrictions on subjects, notes, assessments, or flashcards.
- Plan is stored on the `user` table (`plan` column, enum `free` | `pro` | `unlimited`).
- Limits are enforced server-side on create actions and surfaced in the UI.

## Data Ownership and Security Rules

- All user-owned data must be scoped by authenticated `userId`.
- A user can only access or mutate their own subjects, notes, attendance records, and assessments.
- Data export/import and account deletion operations must enforce ownership checks server-side.

## Main Entities

- `subject`
  - `id`, `name`, `description`, `totalClasses`, `maxMisses`, timestamps, `userId`.
- `flashcard`
  - `id`, `front`, `back`, `state`, `dueAt`, `ease`, `intervalDays`, `learningStep`, `lastReviewedAt`, `reviewCount`, `lapseCount`, `subjectId`, timestamps, `userId`.
- `note`
  - `id`, `title`, `content`, `subjectId`, timestamps, `userId`.
- `attendance_miss`
  - `id`, `missDate`, `subjectId`, timestamps, `userId`.
- `assessment`
  - `id`, `title`, `description`, `type`, `status`, `dueDate`, `score`, `weight`, `subjectId`, timestamps, `userId`.

## Out of Scope (Current)

- Real-time collaboration and sharing.
- Calendar integrations.
- Native mobile apps.
- Social features.
- AI study recommendations.
