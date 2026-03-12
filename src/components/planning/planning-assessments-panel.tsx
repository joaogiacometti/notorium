import { PlanningAssessmentsTable } from "@/components/planning/planning-assessments-table";
import { getAssessmentsForUser } from "@/features/assessments/queries";
import { resolvePlanningSubject } from "@/features/planning/view";
import { getSubjectsForUser } from "@/features/subjects/queries";

interface PlanningAssessmentsPanelProps {
  initialSubjectId?: string;
  userId: string;
}

export async function PlanningAssessmentsPanel({
  initialSubjectId,
  userId,
}: Readonly<PlanningAssessmentsPanelProps>) {
  const [assessments, subjects] = await Promise.all([
    getAssessmentsForUser(userId),
    getSubjectsForUser(userId),
  ]);

  const subjectNamesById = Object.fromEntries(
    subjects.map((subject) => [subject.id, subject.name]),
  );
  const resolvedInitialSubjectId = resolvePlanningSubject(
    initialSubjectId,
    subjects.map((subject) => subject.id),
  );

  return (
    <PlanningAssessmentsTable
      assessments={assessments}
      initialSubjectId={resolvedInitialSubjectId}
      subjects={subjects}
      subjectNamesById={subjectNamesById}
    />
  );
}
