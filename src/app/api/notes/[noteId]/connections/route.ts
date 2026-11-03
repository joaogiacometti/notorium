import { getNoteConnectionsForUser } from "@/features/notes/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface NoteConnectionsRouteContext {
  params: Promise<{ noteId: string }>;
}

/** Links in and out of one owned note; 404 when missing. */
export async function GET(
  _request: Request,
  context: NoteConnectionsRouteContext,
): Promise<Response> {
  const { noteId } = await context.params;
  return runUserReadRoute({
    logScope: "notes.connections",
    schema: idSchema,
    input: noteId,
    read: (user, id) => getNoteConnectionsForUser(user.id, id),
    notFoundErrorCode: "notes.notFound",
  });
}
