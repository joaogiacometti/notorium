import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type {
  FolderDeletionSummary,
  FolderOption,
} from "@/lib/server/api-contracts";

/**
 * Folders with full `path` labels, for the flashcard folder pickers.
 *
 * @example
 * const folders = await fetchFolderOptions();
 */
export function fetchFolderOptions(): Promise<FolderOption[]> {
  return fetchReadApi<FolderOption[]>("/api/folders/options");
}

/**
 * Counts of what deleting a folder removes, across its whole subtree.
 *
 * @example
 * const summary = await fetchFolderDeletionSummary(folderId);
 */
export function fetchFolderDeletionSummary(
  folderId: string,
): Promise<FolderDeletionSummary> {
  return fetchReadApi<FolderDeletionSummary>(
    `/api/folders/${encodeURIComponent(folderId)}/deletion-summary`,
  );
}
