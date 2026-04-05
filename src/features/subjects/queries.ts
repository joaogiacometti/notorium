import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import type { SubjectEntity } from "@/lib/server/api-contracts";

export async function getSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)))
    .orderBy(desc(subject.updatedAt));
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

export async function countSubjectsForUser(userId: string): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)));

  return result[0]?.total ?? 0;
}
