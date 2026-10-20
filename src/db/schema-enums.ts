import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Postgres enum types shared across the Drizzle schema. Extracted from
 * `schema.ts` so table definitions and their value domains stay separately
 * focused. Re-exported from `schema.ts` because drizzle-kit reads only that
 * file (`drizzle.config.ts`) and must see every enum to generate migrations.
 */

export const userAccessStatusEnum = pgEnum("user_access_status", [
  "pending",
  "approved",
  "blocked",
]);

export const flashcardStateEnum = pgEnum("flashcard_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

export const flashcardReviewRatingEnum = pgEnum("flashcard_review_rating", [
  "again",
  "hard",
  "good",
  "easy",
]);
