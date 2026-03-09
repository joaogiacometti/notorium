import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateNoteSubjectPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`]);
}

export function revalidateNoteDetailPaths(subjectId: string, noteId: string) {
  revalidatePaths([
    `/subjects/${subjectId}`,
    `/subjects/${subjectId}/notes/${noteId}`,
  ]);
}
