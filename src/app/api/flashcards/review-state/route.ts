import { getFlashcardReviewStateForUser } from "@/features/flashcard-review/queries";
import { flashcardReviewStateQuerySchema } from "@/features/flashcard-review/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** Due cards, counts, and scheduler settings for a review session. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcard-review.state",
    schema: flashcardReviewStateQuerySchema,
    input: readSearchParams(request.url, { numberKeys: ["limit"] }),
    read: (user, scope) => getFlashcardReviewStateForUser(user.id, scope),
  });
}
