import { addDays } from "date-fns";
import { and, count, desc, eq, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, subject } from "@/db/schema";
import type { PlanningAssessmentsQueryInput } from "@/features/assessments/validation";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  AssessmentDetailEntity,
  AssessmentEntity,
  PlanningAssessmentsPage,
} from "@/lib/server/api-contracts";
import { getAssessmentAverage, getTodayIso } from "./assessments";

export async function getAssessmentsForUser(
  userId: string,
): Promise<AssessmentEntity[]> {
  return getDb()
    .select({ assessment })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(assessment.updatedAt))
    .then((rows) => rows.map((row) => row.assessment));
}

export async function getAssessmentsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<AssessmentEntity[]> {
  return getDb()
    .select({ assessment })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.subjectId, subjectId),
        eq(assessment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(assessment.updatedAt))
    .then((rows) => rows.map((row) => row.assessment));
}

export async function countAssessmentsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
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
  const results = await getDb()
    .select({ id: assessment.id, subjectId: assessment.subjectId })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.id, assessmentId),
        eq(assessment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getAssessmentDetailForUser(
  userId: string,
  assessmentId: string,
): Promise<AssessmentDetailEntity | null> {
  const results = await getDb()
    .select({
      assessment,
      subject: {
        id: subject.id,
        name: subject.name,
      },
    })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.id, assessmentId),
        eq(assessment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

function getPlanningAssessmentOrderBy(
  sortBy: PlanningAssessmentsQueryInput["sortBy"],
) {
  if (sortBy === "updatedAtDesc") {
    return [desc(assessment.updatedAt)];
  }

  if (sortBy === "dueDateAsc") {
    return [
      sql`${assessment.dueDate} asc nulls last`,
      desc(assessment.updatedAt),
    ];
  }

  if (sortBy === "dueDateDesc") {
    return [
      sql`${assessment.dueDate} desc nulls last`,
      desc(assessment.updatedAt),
    ];
  }

  if (sortBy === "scoreDesc") {
    return [
      sql`${assessment.score} desc nulls last`,
      desc(assessment.updatedAt),
    ];
  }

  return [
    sql`case when ${assessment.status} = 'pending' then 0 else 1 end`,
    sql`case when ${assessment.status} = 'pending' and ${assessment.dueDate} is null then 1 else 0 end`,
    sql`case when ${assessment.status} = 'pending' then ${assessment.dueDate} end asc nulls last`,
    desc(assessment.updatedAt),
  ];
}

function getPlanningAssessmentFilters(
  userId: string,
  {
    search,
    subjectId,
    statusFilter,
    typeFilter,
    dueDateFilter,
  }: Pick<
    PlanningAssessmentsQueryInput,
    "search" | "subjectId" | "statusFilter" | "typeFilter" | "dueDateFilter"
  >,
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [
    eq(assessment.userId, userId),
    ...getOwnedActiveSubjectFilters(userId),
  ];
  const normalizedSearch = search?.trim() ?? "";
  const todayIso = getTodayIso();

  if (subjectId) {
    filters.push(eq(assessment.subjectId, subjectId));
  }

  if (normalizedSearch.length > 0) {
    const searchPattern = buildContainsSearchPattern(normalizedSearch);
    filters.push(
      sql<boolean>`(${assessment.title} ilike ${searchPattern} or coalesce(${assessment.description}, '') ilike ${searchPattern})`,
    );
  }

  if (statusFilter === "pending" || statusFilter === "completed") {
    filters.push(eq(assessment.status, statusFilter));
  } else if (statusFilter === "overdue") {
    filters.push(
      eq(assessment.status, "pending"),
      sql<boolean>`${assessment.dueDate} is not null and ${assessment.dueDate} < ${todayIso}`,
    );
  }

  if (typeFilter !== "all") {
    filters.push(eq(assessment.type, typeFilter));
  }

  if (dueDateFilter && dueDateFilter !== "all") {
    if (dueDateFilter === "none") {
      filters.push(sql<boolean>`${assessment.dueDate} is null`);
    } else if (dueDateFilter === "past") {
      filters.push(
        sql<boolean>`${assessment.dueDate} is not null and ${assessment.dueDate} < ${todayIso}`,
      );
    } else if (dueDateFilter === "today") {
      filters.push(eq(assessment.dueDate, todayIso));
    } else if (dueDateFilter === "next7Days") {
      const next7Iso = getTodayIso(addDays(new Date(), 7));
      filters.push(
        sql<boolean>`${assessment.dueDate} >= ${todayIso} and ${assessment.dueDate} <= ${next7Iso}`,
      );
    } else if (dueDateFilter === "next30Days") {
      const next30Iso = getTodayIso(addDays(new Date(), 30));
      filters.push(
        sql<boolean>`${assessment.dueDate} >= ${todayIso} and ${assessment.dueDate} <= ${next30Iso}`,
      );
    }
  }

  return filters;
}

export async function getPlanningAssessmentsPageForUser(
  userId: string,
  input: PlanningAssessmentsQueryInput,
): Promise<PlanningAssessmentsPage> {
  const offset = input.pageIndex * input.pageSize;
  const filters = getPlanningAssessmentFilters(userId, input);
  const [items, totalRows, allCountRows, subjectCountRows, finalGradeRows] =
    await Promise.all([
      getDb()
        .select({ assessment })
        .from(assessment)
        .innerJoin(subject, eq(assessment.subjectId, subject.id))
        .where(and(...filters))
        .orderBy(...getPlanningAssessmentOrderBy(input.sortBy))
        .limit(input.pageSize)
        .offset(offset)
        .then((rows) => rows.map((row) => row.assessment)),
      getDb()
        .select({ total: count() })
        .from(assessment)
        .innerJoin(subject, eq(assessment.subjectId, subject.id))
        .where(and(...filters)),
      getDb()
        .select({ total: count() })
        .from(assessment)
        .innerJoin(subject, eq(assessment.subjectId, subject.id))
        .where(
          and(
            eq(assessment.userId, userId),
            ...getOwnedActiveSubjectFilters(userId),
          ),
        ),
      input.subjectId
        ? getDb()
            .select({ total: count() })
            .from(assessment)
            .innerJoin(subject, eq(assessment.subjectId, subject.id))
            .where(
              and(
                eq(assessment.userId, userId),
                eq(assessment.subjectId, input.subjectId),
                ...getOwnedActiveSubjectFilters(userId),
              ),
            )
        : Promise.resolve([]),
      input.subjectId
        ? getDb()
            .select({
              status: assessment.status,
              score: assessment.score,
              weight: assessment.weight,
              id: assessment.id,
              title: assessment.title,
              description: assessment.description,
              type: assessment.type,
              dueDate: assessment.dueDate,
              subjectId: assessment.subjectId,
              userId: assessment.userId,
              createdAt: assessment.createdAt,
              updatedAt: assessment.updatedAt,
            })
            .from(assessment)
            .innerJoin(subject, eq(assessment.subjectId, subject.id))
            .where(
              and(
                eq(assessment.userId, userId),
                eq(assessment.subjectId, input.subjectId),
                ...getOwnedActiveSubjectFilters(userId),
              ),
            )
        : Promise.resolve([]),
    ]);

  return {
    items,
    total: totalRows[0]?.total ?? 0,
    allCount: allCountRows[0]?.total ?? 0,
    subjectAssessmentCount: input.subjectId
      ? (subjectCountRows[0]?.total ?? 0)
      : null,
    subjectFinalGrade: input.subjectId
      ? getAssessmentAverage(finalGradeRows as AssessmentEntity[])
      : null,
  };
}
