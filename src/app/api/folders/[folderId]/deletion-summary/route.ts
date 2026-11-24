import { getFolderDeletionSummaryForUser } from "@/features/folders/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface FolderDeletionSummaryRouteContext {
  params: Promise<{ folderId: string }>;
}

/** Counts of what deleting one owned folder removes, for the delete dialog. */
export async function GET(
  _request: Request,
  context: FolderDeletionSummaryRouteContext,
): Promise<Response> {
  const { folderId } = await context.params;
  return runUserReadRoute({
    logScope: "folders.deletionSummary",
    schema: idSchema,
    input: folderId,
    read: (user, id) => getFolderDeletionSummaryForUser(user.id, id),
    notFoundErrorCode: "folders.notFound",
  });
}
