import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type { AccountSettings } from "@/lib/server/api-contracts";

/**
 * Load the account settings dialog data.
 *
 * @example
 * const settings = await fetchAccountSettings();
 */
export function fetchAccountSettings(): Promise<AccountSettings> {
  return fetchReadApi<AccountSettings>("/api/account/settings");
}
