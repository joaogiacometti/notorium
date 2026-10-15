import { getFlashcardByIdForUser } from "@/features/flashcards/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface FlashcardRouteContext {
  params: Promise<{ flashcardId: string }>;
}

/** One owned flashcard for the manage edit dialog; 404 when missing. */
export async function GET(
  _request: Request,
  context: FlashcardRouteContext,
): Promise<Response> {
  const { flashcardId } = await context.params;
  return runUserReadRoute({
    logScope: "flashcards.byId",
    schema: idSchema,
    input: flashcardId,
    read: (user, id) => getFlashcardByIdForUser(user.id, id),
    notFoundErrorCode: "flashcards.notFound",
  });
}
