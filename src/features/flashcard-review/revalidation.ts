import { revalidatePaths } from "@/lib/server/revalidation";

export function revalidateFlashcardReviewSubjectPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`, "/flashcards/review"]);
}
