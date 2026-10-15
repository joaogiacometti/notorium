import { getSubjectListItemsForUser } from "@/features/subjects/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Subject list rows (with note counts) for the subjects table refresh. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "subjects.listItems",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getSubjectListItemsForUser(user.id),
  });
}
