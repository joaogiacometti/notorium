import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note, subject } from "@/db/schema";
import type {
  SubjectEntity,
  SubjectListItem,
} from "@/lib/server/api-contracts";

export async function getSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)))
    .orderBy(desc(subject.updatedAt));
}

export async function getAcademicSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.userId, userId),
        eq(subject.kind, "academic"),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(subject.updatedAt));
}

export async function getActiveAcademicSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const results = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, subjectId),
        eq(subject.userId, userId),
        eq(subject.kind, "academic"),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getActiveSubjectByIdForUser(
  userId: string,
  subjectId: string,
): Promise<SubjectEntity | null> {
  const results = await getDb()
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.id, subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getActiveSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const results = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getArchivedSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNotNull(subject.archivedAt)))
    .orderBy(desc(subject.updatedAt));
}

export async function getAllSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));
}

export async function getSubjectListItemsForUser(
  userId: string,
): Promise<SubjectListItem[]> {
  const subjects = await getAllSubjectsForUser(userId);

  if (subjects.length === 0) {
    return [];
  }

  const noteCounts = await getDb()
    .select({ subjectId: note.subjectId, count: count() })
    .from(note)
    .where(eq(note.userId, userId))
    .groupBy(note.subjectId)
    .then((rows) => new Map(rows.map((row) => [row.subjectId, row.count])));

  return subjects.map((currentSubject) => ({
    ...currentSubject,
    notesCount: noteCounts.get(currentSubject.id) ?? 0,
  }));
}

export async function getArchivedSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const results = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, subjectId),
        eq(subject.userId, userId),
        isNotNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const results = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getSubjectRecordsForUser(
  userId: string,
  subjectIds: string[],
): Promise<Array<{ id: string; archivedAt: Date | null }>> {
  if (subjectIds.length === 0) return [];

  return getDb()
    .select({ id: subject.id, archivedAt: subject.archivedAt })
    .from(subject)
    .where(and(inArray(subject.id, subjectIds), eq(subject.userId, userId)));
}

export async function countSubjectsForUser(userId: string): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  return result[0]?.total ?? 0;
}

export async function countTotalSubjectsForUser(
  userId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(eq(subject.userId, userId));

  return result[0]?.total ?? 0;
}
