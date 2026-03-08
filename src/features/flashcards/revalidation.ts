import { revalidatePaths } from "@/lib/revalidation";

export function revalidateFlashcardSubjectPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`]);
}

export function revalidateFlashcardDetailPaths(
  subjectId: string,
  flashcardId: string,
) {
  revalidatePaths([
    `/subjects/${subjectId}`,
    `/subjects/${subjectId}/flashcards/${flashcardId}`,
  ]);
}

export function revalidateFlashcardReviewPaths(
  subjectId: string,
  flashcardId?: string,
) {
  const paths = [`/subjects/${subjectId}`, "/flashcards/review"];

  if (flashcardId) {
    paths.push(`/subjects/${subjectId}/flashcards/${flashcardId}`);
  }

  revalidatePaths(paths);
}
