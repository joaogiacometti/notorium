import { GradesSummary } from "@/components/subjects/grades-summary";
import { getAssessmentsForUser } from "@/features/assessments/queries";
import { getSubjectsForUser } from "@/features/subjects/queries";

interface PlanningAssessmentsPanelProps {
  userId: string;
}

export async function PlanningAssessmentsPanel({
  userId,
}: Readonly<PlanningAssessmentsPanelProps>) {
  const [assessments, subjects] = await Promise.all([
    getAssessmentsForUser(userId),
    getSubjectsForUser(userId),
  ]);

  const subjectNamesById = Object.fromEntries(
    subjects.map((subject) => [subject.id, subject.name]),
  );

  return (
    <GradesSummary
      assessments={assessments}
      showHeader={false}
      showAverage={false}
      showSubjectFilter
      subjectNamesById={subjectNamesById}
    />
  );
}
