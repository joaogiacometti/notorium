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

/** Client query dependencies of a subject create, rename, move, or deletion. */
export async function invalidateSubjectViews(
  client: QueryClient,
): Promise<void> {
  await Promise.all([
    refreshQueries(client, libraryKeys.subjects),
    invalidateDocumentViews(client),
    refreshQueries(client, libraryKeys.flashcards),
  ]);
}

/** Omit subject IDs for changes whose result does not carry the owning subject. */
export async function invalidateDocumentViews(
  client: QueryClient,
  subjectIds?: readonly string[],
): Promise<void> {
  await Promise.all([
    refreshQueries(client, libraryKeys.search),
    // A note may add/remove links to any other note; all connection views depend on it.
    refreshQueries(client, libraryKeys.noteConnections),
    ...(subjectIds
      ? [...new Set(subjectIds)].map((id) =>
          refreshQueries(client, libraryKeys.subjectDocuments(id)),
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
