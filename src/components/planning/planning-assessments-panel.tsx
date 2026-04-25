import { PlanningAssessmentsTable } from "@/components/planning/planning-assessments-table";
import { getPlanningAssessmentsPageForUser } from "@/features/assessments/queries";
import { resolvePlanningSubject } from "@/features/planning/view";
import { getSubjectsForUser } from "@/features/subjects/queries";

interface PlanningAssessmentsPanelProps {
  attachmentsEnabled: boolean;
  initialSubjectId?: string;
  initialSearch?: string;
  initialStatus?: string;
  initialType?: string;
  initialSort?: string;
  userId: string;
}

const planningAssessmentsPageSize = 25;

export async function PlanningAssessmentsPanel({
  attachmentsEnabled,
  initialSubjectId,
  initialSearch,
  initialStatus,
  initialType,
  initialSort,
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
  });

  return (
    <PlanningAssessmentsTable
      initialSubjectId={resolvedInitialSubjectId}
      initialSearch={initialSearch}
      initialStatus={initialStatus}
      initialType={initialType}
      initialSort={initialSort}
      initialPageData={initialPageData}
      attachmentsEnabled={attachmentsEnabled}
      subjects={subjects}
      subjectNamesById={subjectNamesById}
    />
  );
}
