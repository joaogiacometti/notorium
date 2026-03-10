import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateSubjectListPaths() {
  revalidatePaths([
    "/subjects",
    "/subjects/archived",
    "/assessments",
    "/planning",
  ]);
}

export function revalidateSubjectDetailPaths(subjectId: string) {
  revalidatePaths(["/subjects", `/subjects/${subjectId}`]);
}

export function revalidateAllSubjectPaths(subjectId: string) {
  revalidatePaths([
    "/subjects",
    "/subjects/archived",
    `/subjects/${subjectId}`,
    "/assessments",
    "/planning",
  ]);
}
