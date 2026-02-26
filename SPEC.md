# Notorium — Product Specification

## Overview

Notorium is a study management application that helps students organize their academic life. Users can manage subjects, take notes, and track their academic progress — all in one place.

## Problem Statement

Students need a simple, centralized tool to manage their subjects, take notes per subject, and eventually track attendance and grades. Existing tools are either too complex or don't combine these features in a student-friendly way.

## Target Users

University and school students who want to organize their study materials by subject.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Auth:** Better Auth (email/password)
- **Validation:** Zod
- **Forms:** React Hook Form + @hookform/resolvers
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **Linter/Formatter:** Biome
- **Runtime:** Bun
- **Icons:** Lucide React

---

## Features

### Phase 1 — Core (Current)

#### 1.1 Authentication ✅ COMPLETE

- [x] Sign up with email and password
- [x] Sign in with email and password
- [x] Sign out
- [x] Session management
- [x] Navbar shows auth state (sign in/up vs logout)

#### 1.2 Subject Management (CRUD) ✅ COMPLETE

- [x] Create a subject (name, description)
- [x] List all subjects for the authenticated user
- [x] View a single subject
- [x] Edit a subject (name, description)
- [x] Delete a subject
- [x] Each subject is private to the user who created it

**Data model:**
| Field | Type | Notes |
|-------------|-----------|--------------------------------|
| id | text (PK) | Generated ID |
| name | text | Required |
| description | text | Optional |
| userId | text (FK) | References user.id, cascade |
| createdAt | timestamp | Auto-set on creation |
| updatedAt | timestamp | Auto-updated on changes |

**Acceptance criteria:**

- A user can only see, edit, and delete their own subjects
- Subject name is required and non-empty
- Deleting a subject deletes all associated notes (cascade)
- Subject list is sorted by most recently updated

#### 1.3 Notes (CRUD per Subject) ✅ COMPLETE

- [x] Create a note within a subject (title, content)
- [x] List all notes for a subject
- [x] View a single note
- [x] Edit a note (title, content)
- [x] Delete a note

**Data model:**
| Field | Type | Notes |
|-------------|-----------|--------------------------------|
| id | text (PK) | Generated ID |
| title | text | Required |
| content | text | Plain text for now |
| subjectId | text (FK) | References subject.id, cascade |
| userId | text (FK) | References user.id, cascade |
| createdAt | timestamp | Auto-set on creation |
| updatedAt | timestamp | Auto-updated on changes |

**Acceptance criteria:**

- Notes belong to a subject and are private to the subject owner
- Note title is required and non-empty
- Notes list is sorted by most recently updated
- Deleting a subject cascades to delete all its notes

---

### Phase 2 — Future Enhancements

#### 2.1 Attendance Tracking System ✅ COMPLETE

- [x] Configure total classes per subject (e.g., 15)
- [x] Configure max allowed misses per subject (e.g., 4)
- [x] Record a miss for a specific date
- [x] View attendance summary (misses used / max allowed)
- [x] Visual indicator when approaching or exceeding miss limit

**Data model (extends subject table):**
| Field | Type | Notes |
|-------------|-----------|--------------------------------|
| totalClasses| integer | Optional, total classes count |
| maxMisses | integer | Optional, max allowed misses |

**Data model (attendance_miss):**
| Field | Type | Notes |
|-------------|-----------|--------------------------------|
| id | text (PK) | Generated ID |
| missDate | date | Required, date of the miss |
| subjectId | text (FK) | References subject.id, cascade |
| userId | text (FK) | References user.id, cascade |
| createdAt | timestamp | Auto-set on creation |
| updatedAt | timestamp | Auto-updated on changes |

**Acceptance criteria:**

- Attendance settings (totalClasses, maxMisses) are optional per subject
- A user can only manage attendance for their own subjects
- Cannot record duplicate misses for the same date on a subject
- Visual progress bar: green (on track), amber (≥75% misses used), red (limit reached)
- Attendance summary shows miss count, remaining misses, and attendance rate percentage
- Individual miss records can be removed

#### 2.2 Grade System ✅ COMPLETE

- [x] Define grade categories per subject (exams, activities, group activities, lists)
- [x] Add grades to each category
- [x] Calculate weighted or simple averages
- [x] View grade summary per subject

**Data model (grade_category):**
| Field | Type | Notes |
|-------------|-----------|--------------------------------|
| id | text (PK) | Generated ID |
| name | text | Required |
| weight | numeric | Optional, category weight (%) |
| subjectId | text (FK) | References subject.id, cascade |
| userId | text (FK) | References user.id, cascade |
| createdAt | timestamp | Auto-set on creation |
| updatedAt | timestamp | Auto-updated on changes |

**Data model (grade):**
| Field | Type | Notes |
|-------------|-----------|--------------------------------------|
| id | text (PK) | Generated ID |
| name | text | Required |
| value | numeric | Required, grade value (0–100) |
| categoryId | text (FK) | References grade_category.id, cascade|
| userId | text (FK) | References user.id, cascade |
| createdAt | timestamp | Auto-set on creation |
| updatedAt | timestamp | Auto-updated on changes |

**Acceptance criteria:**

- Grade categories belong to a subject and are private to the subject owner
- Category name is required and non-empty
- Optional weight per category enables weighted average calculation
- When weights are set, overall average is computed as a weighted average
- When no weights are set, overall average is a simple average across categories
- Individual grades can be added, edited, and deleted within categories
- Deleting a category cascades to delete all its grades
- Visual color coding: green (≥70), amber (≥50), red (<50)
- Overall average card shows current performance with progress bar

#### 2.3 Markdown Notes ✅ COMPLETE

- [x] Replace plain text note content with Markdown editor
- [x] Render Markdown preview
- [x] Support basic formatting (headings, bold, italic, lists, code blocks)

#### 2.4 UI/UX Improvements ✅ COMPLETE

- [x] Custom 404 (not-found) page
- [x] Loading page/skeleton (loading.tsx)
- [x] Toast notifications (Sonner via shadcn/ui) for success/error feedback
- [x] Dark/light theme toggle (with system preference support)
- [x] Hide misses history behind a collapsible/accordion to avoid cluttering the main UI

---

### Phase 3 — Planned Features

#### 3.1 Global Search ✅ COMPLETE

- [x] Search across all content (subjects, notes)
- [x] Search by subject name
- [x] Search by subject description
- [x] Search inside note content (title and body)
- [x] Display search results with context snippets
- [x] Navigate directly to search results

**Acceptance criteria:**

- Search is accessible from the navbar or main dashboard
- Search is case-insensitive
- Results show matching subjects and notes with highlighted matches
- Clicking a result navigates to the subject or note detail page
- Empty search shows all subjects and notes (no filter applied)
- Search only returns content owned by the authenticated user

#### 3.2 Search Result Caching ✅ COMPLETE

- [x] Cache search results to avoid refetching on dialog reopen
- [x] Configure stale time for cached search data
- [x] Invalidate cache when subjects or notes are created/updated/deleted

**Acceptance criteria:**

- Opening the search dialog shows cached results immediately if available
- Fresh data is fetched in the background when cache is stale
- Cache is invalidated when user creates, edits, or deletes subjects or notes
- Improves perceived performance for frequent search usage

#### 3.3 Subject Module Configuration ✅ COMPLETE

- [x] Configure which modules are enabled per subject (notes, grades, attendance)
- [x] Hide disabled modules from the subject detail view
- [x] Show only enabled modules in the subject UI
- [x] Default: all modules enabled for new subjects

**Data model (extends subject table):**
| Field | Type | Notes |
|-----------------|---------|--------------------------------|
| notesEnabled | boolean | Default true |
| gradesEnabled | boolean | Default true |
| attendanceEnabled | boolean | Default true |

**Acceptance criteria:**

- When creating/editing a subject, user can toggle notes, grades, and attendance modules
- Subject detail page only shows sections for enabled modules
- Disabling notes hides the notes list and "Create Note" button
- Disabling grades hides the grades summary and grade management UI
- Disabling attendance hides the attendance summary and miss recording UI
- Existing data (notes, grades, misses) is preserved when a module is disabled (just hidden)
- Re-enabling a module shows the previously hidden data
- All modules are enabled by default for backward compatibility

#### 3.4 Navbar Account Indicator ✅ COMPLETE

- [x] Display authenticated user's name in the navbar
- [x] Provide account indicator entry point for user actions
- [x] Provide logout action from the account indicator

**Acceptance criteria:**

- Authenticated users see their account name in the navbar
- Account indicator includes a logout action
- Unauthenticated users continue to see Sign In and Sign Up actions

---

### Phase 4 — Future Features

#### 4.1 Note Image Attachments

- [x] Attach images to notes
- [x] Render attached images inside note detail view
- [x] Allow removing attached images from notes

**Acceptance criteria:**

- Users can upload one or more images to a note they own
- Uploaded images are visible when viewing the note
- Users can remove attachments without deleting the note
- File validation enforces allowed image types and size limits
- Users cannot access attachments from notes they do not own

#### 4.2 Assessment Planner (Grade System Refactor)

- [x] Replace the current grade-category model with a unified `assessment` entity
- [x] Support assessment types (exam, assignment, project, presentation, homework, other)
- [x] Support status tracking (pending, completed)
- [x] Support due dates with overdue and countdown states
- [x] Support optional grading fields (score and weight)
- [x] Compute subject average directly from completed assessments

### Purpose

The Assessment Planner replaces the rigid grade-category structure with a flexible academic item model.

Instead of forcing every item into a grade category, assessments represent:

- Evaluative work (exams, assignments, projects)
- Academic tasks with deadlines
- Graded and ungraded items

This transforms the subject view into both:

- A performance tracker
- A deadline and task planner

### Data Model (`assessment`)

| Field       | Type      | Notes                                                                          |
| ----------- | --------- | ------------------------------------------------------------------------------ |
| id          | text (PK) | Generated ID                                                                   |
| title       | text      | Required                                                                       |
| description | text      | Optional                                                                       |
| type        | enum      | `exam` \| `assignment` \| `project` \| `presentation` \| `homework` \| `other` |
| status      | enum      | `pending` \| `completed`                                                       |
| dueDate     | date      | Optional                                                                       |
| score       | numeric   | Optional                                                                       |
| weight      | numeric   | Optional (percentage or relative weight)                                       |
| subjectId   | text (FK) | References subject.id, cascade                                                 |
| userId      | text (FK) | References user.id, cascade                                                    |
| createdAt   | timestamp | Auto-set on creation                                                           |
| updatedAt   | timestamp | Auto-updated on changes                                                        |

### Behavioral Requirements

#### General Rules

- Assessments can be created with only a title
- `score` and `weight` are optional
- New assessments default to `pending`
- Assessments are private to the authenticated user
- Deleting a subject cascades to delete its assessments

#### Status Logic

- `pending` assessments represent upcoming or ongoing tasks
- `completed` assessments represent finished tasks
- An assessment can be completed without a score
- Only completed assessments with a defined `score` are considered for average calculation

#### Due Date Logic

If:

- `status = pending`
- `dueDate < today`

The assessment is marked as overdue.

If:

- `status = pending`
- `dueDate >= today`

The UI displays a countdown (for example, "3 days left").

If:

- `status = completed`

Overdue logic does not apply.

### Average Calculation Rules

The subject average is calculated using only assessments where:

- `status = completed`
- `score IS NOT NULL`

If at least one completed assessment has `weight` defined, use weighted average:

```text
sum(score * weight) / sum(weight)
```

If no weights are defined, use simple average:

```text
sum(score) / count(score)
```

### Sorting Rules

Default ordering:

1. Pending assessments first
2. Among pending: nearest `dueDate` first and assessments without `dueDate` last
3. Completed assessments sorted by most recently updated

### Filtering Options

- All
- Pending
- Completed
- Overdue
- By type

Filtering must always be scoped to `userId`.

### UI Requirements

#### Visual States

Pending:

- Neutral styling
- Due date badge
- Countdown indicator

Overdue:

- Highlighted in red
- Overdue badge

Completed:

- Muted styling
- Completion indicator
- Optional grade badge (for example, `85` with weight if defined)

### Subject View Changes

Replace the current grade category structure with a single Assessments section.

Grouped by:

- Pending
- Completed

Each assessment displays:

- Title
- Type badge
- Due date (if defined)
- Status indicator
- Optional score
- Optional weight

### Acceptance Criteria

- Users can create, edit, and delete assessments inside their own subjects
- Users can create valid assessments without score or weight
- Completed assessments with score contribute correctly to subject average
- Pending assessments do not affect subject average
- Overdue pending assessments are clearly highlighted
- Sorting and filtering behave according to specification
- Access is scoped by `userId`

### 4.3 Mobile Image Viewer Mode

- [x] Open note images in fullscreen modal
- [x] Improve image readability on mobile devices

### Purpose

Improve the reading experience of image attachments inside notes, especially on mobile devices where inline images are too small or constrained by layout width.

This feature enhances usability without changing the data model.

---

### Behavioral Requirements

#### Open Behavior

- Tapping an image inside a note opens it in a fullscreen modal
- Background content is visually dimmed
- Background scrolling is disabled while the viewer is open
- Image is displayed at its natural resolution (not markdown-constrained width)

#### Close Behavior

The viewer can be closed by:

- Clicking a close button
- Pressing `ESC` (desktop)
- Tapping outside the image

---

### UI Requirements

- Use a modal/dialog component (e.g., shadcn `Dialog`)
- Viewer occupies full viewport (`100vh`)
- Image is centered and scales to fit screen
- Close button is clearly visible (top-right)
- Minimal UI to avoid distraction

---

### Acceptance Criteria

- Tapping an image opens it in fullscreen
- Image renders larger than inline view
- Viewer disables background scroll
- Viewer can be closed reliably
- Only images belonging to the authenticated user's note are accessible

---

## Out of Scope (v1)

- Real-time collaboration / sharing subjects between users
- Calendar integration
- Mobile native app
- Social features (profiles, following)
- AI-powered study suggestions

---

## User Stories

### Authentication

- As a student, I want to sign up so I can create my own account.
- As a student, I want to sign in so I can access my subjects.
- As a student, I want to sign out so my session is secure.

### Subjects

- As a student, I want to create a subject so I can organize my notes by class.
- As a student, I want to see all my subjects so I can navigate between them.
- As a student, I want to edit a subject so I can fix typos or update the description.
- As a student, I want to delete a subject I no longer need.

### Notes

- As a student, I want to create a note inside a subject so I can record what I learned.
- As a student, I want to view my notes for a subject so I can review them.
- As a student, I want to edit a note so I can correct or expand it.
- As a student, I want to delete a note I no longer need.
