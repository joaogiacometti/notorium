import { getFlashcardContentsForUser } from "@/features/flashcards/queries";
import { flashcardContentsQuerySchema } from "@/features/flashcards/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** Front, back, and subject path of the requested owned flashcards (copy). */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcards.contents",
    schema: flashcardContentsQuerySchema,
    input: readSearchParams(request.url, { arrayKeys: ["ids"] }),
    read: (user, { ids }) => getFlashcardContentsForUser(user.id, ids),
  });
}
