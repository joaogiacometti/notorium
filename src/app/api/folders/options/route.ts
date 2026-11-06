import { getAllFoldersWithPathsForUser } from "@/features/folders/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Folders with full `path` labels for the folder pickers. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "folders.options",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getAllFoldersWithPathsForUser(user.id),
  });
}
