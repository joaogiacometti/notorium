import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateFlashcardSubjectPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`, "/flashcards"]);
}

export function revalidateFlashcardDetailPaths(
  subjectId: string,
  flashcardId: string,
) {
  revalidatePaths([
    `/subjects/${subjectId}`,
    `/subjects/${subjectId}/flashcards/${flashcardId}`,
    "/flashcards",
  ]);
}

export function revalidateFlashcardReviewPaths(
  subjectId: string,
  flashcardId?: string,
) {
  const paths = [`/subjects/${subjectId}`, "/flashcards"];

  if (flashcardId) {
    paths.push(`/subjects/${subjectId}/flashcards/${flashcardId}`);
  }

  revalidatePaths(paths);
}
