import { getAllFlashcardsForExam } from "@/features/flashcard-review/queries";
import { flashcardExamScopeSchema } from "@/features/flashcard-review/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** Every card in scope for exam mode. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcard-review.examCards",
    schema: flashcardExamScopeSchema,
    input: readSearchParams(request.url),
    read: (user, scope) => getAllFlashcardsForExam(user.id, scope),
  });
}
