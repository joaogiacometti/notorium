import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Postgres enum types shared across the Drizzle schema. Extracted from
 * `schema.ts` so table definitions and their value domains stay separately
 * focused. Re-exported from `schema.ts` for backward-compatible imports.
 */

export const userAccessStatusEnum = pgEnum("user_access_status", [
  "pending",
  "approved",
  "blocked",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "exam",
  "assignment",
  "project",
  "presentation",
  "homework",
  "other",
]);

export const assessmentStatusEnum = pgEnum("assessment_status", [
  "pending",
  "completed",
]);

export const flashcardStateEnum = pgEnum("flashcard_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

export const flashcardTypeEnum = pgEnum("flashcard_type", ["basic", "cloze"]);

export const flashcardReviewRatingEnum = pgEnum("flashcard_review_rating", [
  "again",
  "hard",
  "good",
  "easy",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "claimed",
  "sent",
  "failed",
]);
