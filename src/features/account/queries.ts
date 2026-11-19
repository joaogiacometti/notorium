import { timeZoneOptions } from "@/features/account/time-zones";
import {
  getFsrsOptimizationSettings,
  readFsrsSettings,
} from "@/features/flashcards/fsrs/settings-queries";
import { formatDateLong } from "@/lib/dates/format";
import type { AccountSettings } from "@/lib/server/api-contracts";

interface AccountSettingsUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  timeZone: string;
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
  const [fsrsOptimization, { newCardsPerDay }] = await Promise.all([
    getFsrsOptimizationSettings(user.id),
    readFsrsSettings(user.id),
  ]);

  return {
    name: user.name,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
    timeZone: user.timeZone,
    timeZoneOptions,
    memberSince: formatDateLong(user.createdAt, user.timeZone),
    newCardsPerDay,
    fsrsOptimization: {
      ...fsrsOptimization,
      lastOptimizedOn: fsrsOptimization.lastOptimizedAt
        ? formatDateLong(fsrsOptimization.lastOptimizedAt, user.timeZone)
        : null,
    },
  };
}
