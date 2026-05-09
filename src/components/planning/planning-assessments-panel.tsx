import { PlanningAssessmentsTable } from "@/components/planning/planning-assessments-table";
import {
  resolvePlanningAssessmentSort,
  resolvePlanningAssessmentStatusFilter,
  resolvePlanningAssessmentTypeFilter,
} from "@/features/assessments/assessment-filters";
import { getPlanningAssessmentsPageForUser } from "@/features/assessments/queries";
import { resolvePlanningSubject } from "@/features/planning/view";
import { getSubjectsForUser } from "@/features/subjects/queries";

interface PlanningAssessmentsPanelProps {
  initialSubjectId?: string;
  initialSearch?: string;
  initialStatus?: string;
  initialType?: string;
  initialSort?: string;
  initialPageSize: number;
  userId: string;
}

export async function PlanningAssessmentsPanel({
  initialSubjectId,
  initialSearch,
  initialStatus,
  initialType,
  initialSort,
  initialPageSize,
  userId,
}: Readonly<PlanningAssessmentsPanelProps>) {
  const subjects = await getSubjectsForUser(userId);

  const subjectNamesById = Object.fromEntries(
    subjects.map((subject) => [subject.id, subject.name]),
  );
  const resolvedInitialSubjectId = resolvePlanningSubject(
    initialSubjectId,
    subjects.map((subject) => subject.id),
  );
  const resolvedInitialStatus =
    resolvePlanningAssessmentStatusFilter(initialStatus);
  const resolvedInitialType = resolvePlanningAssessmentTypeFilter(initialType);
  const resolvedInitialSort = resolvePlanningAssessmentSort(initialSort);
  const resolvedInitialSearch = initialSearch ?? "";
  const initialPageData = await getPlanningAssessmentsPageForUser(userId, {
    pageIndex: 0,
    pageSize: initialPageSize,
    search: resolvedInitialSearch,
    subjectId: resolvedInitialSubjectId,
    statusFilter: resolvedInitialStatus,
    typeFilter: resolvedInitialType,
    sortBy: resolvedInitialSort,
  });

  return (
    <PlanningAssessmentsTable
      initialSubjectId={resolvedInitialSubjectId}
      initialSearch={resolvedInitialSearch}
      initialStatus={resolvedInitialStatus}
      initialType={resolvedInitialType}
      initialSort={resolvedInitialSort}
      initialPageSize={initialPageSize}
      initialPageData={initialPageData}
      subjects={subjects}
      subjectNamesById={subjectNamesById}
    />
  );
}
