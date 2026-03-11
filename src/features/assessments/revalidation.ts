import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateAssessmentPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`, "/planning"]);
}
