import { getAccountSettingsForUser } from "@/features/account/queries";
import {
  emptyReadInputSchema,
  runUserReadRoute,
} from "@/lib/server/read-route";

/** Account settings dialog data, fetched lazily when the dialog opens. */
export async function GET(): Promise<Response> {
  return runUserReadRoute({
    logScope: "account.settings",
    schema: emptyReadInputSchema,
    input: {},
    read: (user) => getAccountSettingsForUser(user),
  });
}
