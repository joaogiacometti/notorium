import { getRecentSearchDataForUser } from "@/features/search/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Recently updated items shown before the user types a search query. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "search.recent",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getRecentSearchDataForUser(user.id),
  });
}
