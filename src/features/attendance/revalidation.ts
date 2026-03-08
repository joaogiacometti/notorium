import { revalidatePaths } from "@/lib/revalidation";

export function revalidateAttendancePaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`]);
}
