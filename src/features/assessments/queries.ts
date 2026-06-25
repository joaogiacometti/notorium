import { addDays } from "date-fns";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, subject } from "@/db/schema";
import type { PlanningAssessmentsQueryInput } from "@/features/assessments/validation";
import { getAssessmentAttachmentsForUser } from "@/features/attachments/queries";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  AssessmentDetailEntity,
  AssessmentEntity,
  PlanningAssessmentsPage,
} from "@/lib/server/api-contracts";
import { getTodayIso } from "./assessments";

/**
 * Soonest upcoming assessments (due today or later) across all of a user's
 * active subjects, ordered by due date, used by the home dashboard. Assessments
 * with no due date are excluded by the `>=` comparison.
 *
 * @example
 * const upcoming = await getUpcomingAssessmentsForUser(userId, 5);
 */
export async function getUpcomingAssessmentsForUser(
  userId: string,
  limit: number,
): Promise<AssessmentEntity[]> {
  return getDb()
    .select({ assessment })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        eq(assessment.userId, userId),
        gte(assessment.dueDate, getTodayIso()),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(asc(assessment.dueDate))
    .limit(limit)
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

export async function getAssessmentRecordsForUser(
  userId: string,
  assessmentIds: string[],
): Promise<Array<{ id: string; subjectId: string }>> {
  if (assessmentIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ id: assessment.id, subjectId: assessment.subjectId })
    .from(assessment)
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .where(
      and(
        inArray(assessment.id, assessmentIds),
        eq(assessment.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );
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

  const detail = results[0];
  if (!detail) {
    return null;
  }

  const attachments = await getAssessmentAttachmentsForUser(
    userId,
    assessmentId,
  );

  return { ...detail, attachments };
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
  const [items, totalRows, subjectStatsRows] = await Promise.all([
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
    input.subjectId
      ? getDb()
          .select({
            total: count(),
            weightedSum: sql<number>`coalesce(sum(case when ${assessment.status} = 'completed' and ${assessment.score} is not null and ${assessment.weight} is not null and ${assessment.weight} > 0 then ${assessment.score} * ${assessment.weight} else 0 end), 0)`,
            totalWeight: sql<number>`coalesce(sum(case when ${assessment.status} = 'completed' and ${assessment.score} is not null and ${assessment.weight} is not null and ${assessment.weight} > 0 then ${assessment.weight} else 0 end), 0)`,
            weightedCount: sql<number>`coalesce(sum(case when ${assessment.status} = 'completed' and ${assessment.score} is not null and ${assessment.weight} is not null and ${assessment.weight} > 0 then 1 else 0 end), 0)`,
            averageScore: sql<
              number | null
            >`avg(case when ${assessment.status} = 'completed' and ${assessment.score} is not null then ${assessment.score} end)`,
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

  const total = totalRows[0]?.total ?? 0;
  const subjectStats = subjectStatsRows[0];
  let hasAnyAssessments = total > 0 || (subjectStats?.total ?? 0) > 0;
  if (!hasAnyAssessments) {
    const rows = await getDb()
      .select({ id: assessment.id })
      .from(assessment)
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .where(
        and(
          eq(assessment.userId, userId),
          ...getOwnedActiveSubjectFilters(userId),
        ),
      )
      .limit(1);

    hasAnyAssessments = rows.length > 0;
  }

  return {
    items,
    total,
    hasAnyAssessments,
    subjectAssessmentCount: input.subjectId ? (subjectStats?.total ?? 0) : null,
    subjectFinalGrade: input.subjectId
      ? (() => {
          if (!subjectStats) {
            return null;
          }

          if (subjectStats.weightedCount > 0 && subjectStats.totalWeight > 0) {
            return subjectStats.weightedSum / subjectStats.totalWeight;
          }

          return subjectStats.averageScore ?? null;
        })()
      : null,
  };
}
