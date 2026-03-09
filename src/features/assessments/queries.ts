import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment, subject } from "@/db/schema";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

export async function getAssessmentsForUser(
  userId: string,
): Promise<AssessmentEntity[]> {
  return db
    .select({ assessment })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(assessment.updatedAt))
    .then((rows) => rows.map((row) => row.assessment));
}

export async function getAssessmentsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<AssessmentEntity[]> {
  return db
    .select({ assessment })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.subjectId, subjectId),
        eq(assessment.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(assessment.updatedAt))
    .then((rows) => rows.map((row) => row.assessment));
}

export async function countAssessmentsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(assessment)
    .where(
      and(eq(assessment.subjectId, subjectId), eq(assessment.userId, userId)),
    );

  return result[0]?.total ?? 0;
}

export async function getAssessmentRecordForUser(
  userId: string,
  assessmentId: string,
): Promise<{ id: string; subjectId: string } | null> {
  const results = await db
    .select({ id: assessment.id, subjectId: assessment.subjectId })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.id, assessmentId),
        eq(assessment.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}
