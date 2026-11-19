import { isNull, type SQL } from "drizzle-orm";
import { flashcard } from "@/db/schema";

/**
 * Cards that take part in review: not archived. The due rule, review totals,
 * exams, and the struggling filter all apply it, so archiving removes a card
 * from every one of them.
 *
 * @example
 * filters.push(activeFlashcardFilter());
 */
export function activeFlashcardFilter(): SQL {
  return isNull(flashcard.archivedAt);
}
