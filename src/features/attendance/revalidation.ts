import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateAttendancePaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`]);
}
