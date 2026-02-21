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

#### 2.4 UI/UX Improvements

- [ ] Custom 404 (not-found) page
- [ ] Loading page/skeleton (loading.tsx)
- [ ] Toast notifications (Sonner via shadcn/ui) for success/error feedback
- [ ] Dark/light theme toggle (with system preference support)
- [ ] Hide misses history behind a collapsible/accordion to avoid cluttering the main UI

#### 2.5 Component Architecture Refactoring

- [ ] Move non-reusable components (used only in one page/feature) out of `@src/components` and co-locate them near their implementation (e.g., in a `components` folder within the specific app route).
- [ ] Ensure that `@src/components` strictly contains only reusable elements that are shared across multiple pages.
- [ ] Update all corresponding imports throughout the project.

---

## Out of Scope (v1)

- Real-time collaboration / sharing subjects between users
- File uploads or attachments
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
