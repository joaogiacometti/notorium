import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type { FolderOption } from "@/lib/server/api-contracts";

/**
 * Folders with full `path` labels, for the flashcard folder pickers.
 *
 * @example
 * const folders = await fetchFolderOptions();
 */
export function fetchFolderOptions(): Promise<FolderOption[]> {
  return fetchReadApi<FolderOption[]>("/api/folders/options");
}
