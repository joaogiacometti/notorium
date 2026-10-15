import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface SubjectDocumentsRouteContext {
  params: Promise<{ subjectId: string }>;
}

/**
 * One subject's notes + mindmaps for the tree sidebar, fetched the first time
 * a subject node is expanded. Ownership is enforced by `userId`.
 */
export async function GET(
  _request: Request,
  context: SubjectDocumentsRouteContext,
): Promise<Response> {
  const { subjectId } = await context.params;
  return runUserReadRoute({
    logScope: "subjects.documents",
    schema: idSchema,
    input: subjectId,
    read: (user, id) => getSubjectDocumentsForUser(user.id, id),
  });
}
