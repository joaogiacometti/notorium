import { revalidatePaths } from "@/lib/revalidation";

export function revalidateAssessmentPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`, "/assessments"]);
}
