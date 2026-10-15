import {
  getAllFlashcardIdsForSubject,
  getAllFlashcardIdsForUser,
} from "@/features/flashcards/queries";
import { flashcardIdsQuerySchema } from "@/features/flashcards/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** Every owned flashcard id, or only one subject's when `subjectId` is set. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcards.ids",
    schema: flashcardIdsQuerySchema,
    input: readSearchParams(request.url),
    read: (user, { subjectId }) =>
      subjectId
        ? getAllFlashcardIdsForSubject(user.id, subjectId)
        : getAllFlashcardIdsForUser(user.id),
  });
}
