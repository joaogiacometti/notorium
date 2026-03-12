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

export function revalidateFlashcardMovePaths(
  previousSubjectId: string,
  nextSubjectId: string,
  flashcardId: string,
) {
  const paths = [
    `/subjects/${previousSubjectId}`,
    `/subjects/${nextSubjectId}`,
    "/flashcards",
    `/subjects/${nextSubjectId}/flashcards/${flashcardId}`,
  ];

  if (previousSubjectId !== nextSubjectId) {
    paths.push(`/subjects/${previousSubjectId}/flashcards/${flashcardId}`);
  }

  revalidatePaths(paths);
}

export function revalidateFlashcardBulkDeletePaths(subjectIds: string[]) {
  revalidatePaths([
    ...subjectIds.map((subjectId) => `/subjects/${subjectId}`),
    "/flashcards",
  ]);
}

export function revalidateFlashcardBulkMovePaths(
  previousSubjectIds: string[],
  nextSubjectId: string,
) {
  revalidatePaths([
    ...previousSubjectIds.map((subjectId) => `/subjects/${subjectId}`),
    `/subjects/${nextSubjectId}`,
    "/flashcards",
  ]);
}
