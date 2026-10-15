import { getFlashcardsManagePageForUser } from "@/features/flashcards/queries";
import { flashcardsManageQuerySchema } from "@/features/flashcards/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** One filtered, paginated page of the flashcard manage table. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcards.managePage",
    schema: flashcardsManageQuerySchema,
    input: readSearchParams(request.url, {
      numberKeys: ["pageIndex", "pageSize"],
      arrayKeys: ["subjectIds"],
    }),
    read: (user, query) => getFlashcardsManagePageForUser(user.id, query),
  });
}
