import { eq, type SQL } from "drizzle-orm";
import { subject } from "@/db/schema";

/**
 * Ownership predicate for subject-backed records of either kind.
 *
 * @example query.where(and(...getOwnedActiveSubjectFilters(userId)));
 */
export function getOwnedActiveSubjectFilters(userId: string): SQL<unknown>[] {
  return [eq(subject.userId, userId)];
}

/**
 * Ownership and kind predicates for attendance and assessment records.
 *
 * @example query.where(and(...getOwnedAcademicSubjectFilters(userId)));
 */
export function getOwnedAcademicSubjectFilters(userId: string): SQL<unknown>[] {
  return [eq(subject.userId, userId), eq(subject.kind, "academic")];
}
