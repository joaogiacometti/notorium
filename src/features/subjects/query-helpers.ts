import { eq, isNull, type SQL } from "drizzle-orm";
import { subject } from "@/db/schema";

export function getOwnedActiveSubjectFilters(userId: string): SQL<unknown>[] {
  return [eq(subject.userId, userId), isNull(subject.archivedAt)];
}

export function getOwnedActiveSubjectByIdFilters(
  userId: string,
  subjectId: string,
): SQL<unknown>[] {
  return [eq(subject.id, subjectId), ...getOwnedActiveSubjectFilters(userId)];
}
