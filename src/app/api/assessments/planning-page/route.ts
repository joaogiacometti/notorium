import { getPlanningAssessmentsPageForUser } from "@/features/assessments/queries";
import { planningAssessmentsQuerySchema } from "@/features/assessments/validation";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";

/** One filtered, paginated page of the planning assessments table. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "assessments.planningPage",
    schema: planningAssessmentsQuerySchema,
    input: readSearchParams(request.url, {
      numberKeys: ["pageIndex", "pageSize"],
    }),
    read: (user, query) => getPlanningAssessmentsPageForUser(user.id, query),
  });
}
