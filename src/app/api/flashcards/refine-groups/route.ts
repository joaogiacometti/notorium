import { getRefineGroupsForUser } from "@/features/flashcards/refine/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Mastered and struggling card groups for the manage refine mode. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcards.refineGroups",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getRefineGroupsForUser(user.id),
  });
}
