import type { QueryClient } from "@tanstack/react-query";
import { libraryKeys } from "@/lib/client-cache/queries";

async function refreshQueries(
  client: QueryClient,
  queryKey: readonly string[],
): Promise<void> {
  // Cancel even an initial load: its pre-write snapshot must not become the
  // cached result after a successful mutation, including when it resolves late.
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}

/** Client query dependencies of a folder create, rename, move, or deletion. */
export async function invalidateFolderViews(
  client: QueryClient,
): Promise<void> {
  await Promise.all([
    refreshQueries(client, libraryKeys.folders),
    invalidateDocumentViews(client),
    refreshQueries(client, libraryKeys.flashcards),
  ]);
}

/** Omit folder IDs for changes whose result does not carry the owning folder. */
export async function invalidateDocumentViews(
  client: QueryClient,
  folderIds?: readonly string[],
): Promise<void> {
  await Promise.all([
    refreshQueries(client, libraryKeys.search),
    // A note may add/remove links to any other note; all connection views depend on it.
    refreshQueries(client, libraryKeys.noteConnections),
    ...(folderIds
      ? [...new Set(folderIds)].map((id) =>
          refreshQueries(client, libraryKeys.folderDocuments(id)),
        )
      : [refreshQueries(client, libraryKeys.documents)]),
  ]);
}

export async function invalidateFlashcardViews(
  client: QueryClient,
): Promise<void> {
  await Promise.all([
    refreshQueries(client, libraryKeys.search),
    refreshQueries(client, libraryKeys.flashcards),
  ]);
}
