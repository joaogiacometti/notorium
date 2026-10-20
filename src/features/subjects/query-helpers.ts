import { eq, type SQL } from "drizzle-orm";
import { subject } from "@/db/schema";

/**
 * Ownership predicate for subject-backed records.
 *
 * @example query.where(and(...getOwnedActiveSubjectFilters(userId)));
 */
export function getOwnedActiveSubjectFilters(userId: string): SQL<unknown>[] {
  return [eq(subject.userId, userId)];
}
