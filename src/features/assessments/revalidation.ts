import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateAssessmentPaths(
  subjectId: string,
  assessmentId?: string,
) {
  revalidatePaths(
    [`/subjects/${subjectId}`, "/planning"].concat(
      assessmentId ? [`/assessments/${assessmentId}`] : [],
    ),
  );
}
