import { getFsrsOptimizationSettings } from "@/features/flashcards/fsrs/settings-queries";
import type { AccountSettings } from "@/lib/server/api-contracts";
import { areWorkflowsEnabled } from "@/lib/workflows/config";

interface AccountSettingsUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Read every field the account settings dialog renders. Called lazily when the
 * dialog opens so app pages never pay for these queries on each navigation.
 *
 * @example
 * const settings = await getAccountSettingsForUser(session.user);
 */
export async function getAccountSettingsForUser(
  user: AccountSettingsUser,
): Promise<AccountSettings> {
  const fsrsOptimization = await getFsrsOptimizationSettings(user.id);

  return {
    name: user.name,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
    workflowsEnabled: areWorkflowsEnabled(),
    fsrsOptimization,
  };
}
