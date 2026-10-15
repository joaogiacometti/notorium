import { getMindmapByIdForUser } from "@/features/mindmaps/queries";
import { runUserReadRoute } from "@/lib/server/read-route";
import { idSchema } from "@/lib/validations/schemas";

interface MindmapRouteContext {
  params: Promise<{ mindmapId: string }>;
}

/** One owned mindmap (graph included) for PNG export; 404 when missing. */
export async function GET(
  _request: Request,
  context: MindmapRouteContext,
): Promise<Response> {
  const { mindmapId } = await context.params;
  return runUserReadRoute({
    logScope: "mindmaps.byId",
    schema: idSchema,
    input: mindmapId,
    read: (user, id) => getMindmapByIdForUser(user.id, id),
    notFoundErrorCode: "mindmaps.notFound",
  });
}
