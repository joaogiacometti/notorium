import { getFolderDocumentsForUser } from "@/features/documents/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface FolderDocumentsRouteContext {
  params: Promise<{ folderId: string }>;
}

/**
 * One folder's notes for the tree sidebar, fetched the first time
 * a folder node is expanded. Ownership is enforced by `userId`.
 */
export async function GET(
  _request: Request,
  context: FolderDocumentsRouteContext,
): Promise<Response> {
  const { folderId } = await context.params;
  return runUserReadRoute({
    logScope: "folders.documents",
    schema: idSchema,
    input: folderId,
    read: (user, id) => getFolderDocumentsForUser(user.id, id),
  });
}
