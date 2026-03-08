import { revalidatePaths } from "@/lib/revalidation";

export function revalidateFlashcardReviewSubjectPaths(subjectId: string) {
  revalidatePaths([`/subjects/${subjectId}`, "/flashcards/review"]);
}
