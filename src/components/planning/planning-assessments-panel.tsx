import { PlanningAssessmentsTable } from "@/components/planning/planning-assessments-table";
import { getTodayIso } from "@/features/assessments/assessments";
import { getPlanningAssessmentsPageForUser } from "@/features/assessments/queries";
import { resolvePlanningSubject } from "@/features/planning/view";
import { getSubjectsForUser } from "@/features/subjects/queries";

interface PlanningAssessmentsPanelProps {
  initialSubjectId?: string;
  userId: string;
}

const planningAssessmentsPageSize = 25;

export async function PlanningAssessmentsPanel({
  initialSubjectId,
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
  const initialPageData = await getPlanningAssessmentsPageForUser(userId, {
    pageIndex: 0,
    pageSize: planningAssessmentsPageSize,
    search: "",
    subjectId: resolvedInitialSubjectId,
    statusFilter: "all",
    typeFilter: "all",
    sortBy: "smart",
    todayIso: getTodayIso(),
  });

  return (
    <PlanningAssessmentsTable
      initialSubjectId={resolvedInitialSubjectId}
      initialPageData={initialPageData}
      subjects={subjects}
      subjectNamesById={subjectNamesById}
    />
  );
}
