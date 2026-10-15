import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Subjects with full `path` labels for the subject pickers. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "subjects.options",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getAllSubjectsWithPathsForUser(user.id),
  });
}
