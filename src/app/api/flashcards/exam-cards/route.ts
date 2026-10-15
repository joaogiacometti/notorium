import { getAllFlashcardsForExam } from "@/features/flashcard-review/queries";
import { flashcardExamScopeSchema } from "@/features/flashcard-review/validation";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs/settings";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/**
 * Every card in scope for exam mode. `ensureFsrsSettings` is an idempotent
 * first-use initialization, so this GET stays safe to repeat.
 */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcard-review.examCards",
    schema: flashcardExamScopeSchema,
    input: readSearchParams(request.url),
    read: async (user, scope) => {
      await ensureFsrsSettings(user.id);
      return getAllFlashcardsForExam(user.id, scope);
    },
  });
}
