import { getStrugglingFlashcardsForUser } from "@/features/flashcards/refine/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Struggling (leech) cards for the manage refine mode. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "flashcards.struggling",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getStrugglingFlashcardsForUser(user.id),
  });
}
