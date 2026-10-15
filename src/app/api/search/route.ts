import { z } from "zod";
import { getSearchDataForUser } from "@/features/search/queries";
import { LIMITS } from "@/lib/config/limits";
import type { SearchData } from "@/lib/server/api-contracts";
import { readSearchParams, runUserReadRoute } from "@/lib/server/read-route";
import { searchQuerySchema } from "@/lib/validations/search";

const searchRouteInputSchema = z.object({ q: z.string().optional() });

/** Global search results for `q`; empty below the minimum or above the max. */
export async function GET(request: Request): Promise<Response> {
  return runUserReadRoute({
    logScope: "search.query",
    schema: searchRouteInputSchema,
    input: readSearchParams(request.url),
    read: (user, { q }) => searchForQuery(user.id, q),
  });
}

async function searchForQuery(
  userId: string,
  rawQuery: string | undefined,
): Promise<SearchData> {
  const parsed = searchQuerySchema.safeParse(rawQuery);
  if (!parsed.success || parsed.data.length < LIMITS.searchQueryMin) {
    return { subjects: [], notes: [], flashcards: [], mindmaps: [] };
  }

  return getSearchDataForUser(userId, parsed.data);
}
