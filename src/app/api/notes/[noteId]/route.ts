import { getNoteByIdForUser } from "@/features/notes/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface NoteRouteContext {
  params: Promise<{ noteId: string }>;
}

/** One owned note's last saved content for copy actions; 404 when missing. */
export async function GET(
  _request: Request,
  context: NoteRouteContext,
): Promise<Response> {
  const { noteId } = await context.params;
  return runUserReadRoute({
    logScope: "notes.byId",
    schema: idSchema,
    input: noteId,
    read: (user, id) => getNoteByIdForUser(user.id, id),
    notFoundErrorCode: "notes.notFound",
  });
}
