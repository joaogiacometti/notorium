import { queryOptions } from "@tanstack/react-query";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import { fetchAccountSettings } from "@/lib/read-api/account";
import {
  fetchFolderDocuments,
  fetchNoteConnections,
} from "@/lib/read-api/documents";
import { fetchFlashcardsManagePage } from "@/lib/read-api/flashcards";
import {
  fetchFolderDeletionSummary,
  fetchFolderOptions,
} from "@/lib/read-api/folders";

// The authenticated layout owns a QueryClient per user. Keys describe resources,
// not the component displaying them, so every consumer sees the same updates.
export const libraryKeys = {
  folders: ["folders"] as const,
  folderOptions: ["folders", "options"] as const,
  // Outside the `folders` prefix: folder invalidation after a delete must not
  // refetch the deleted folder's summary while its dialog is closing.
  folderDeletionSummary: (folderId: string) =>
    ["folder-deletion-summary", folderId] as const,
  documents: ["folder-documents"] as const,
  folderDocuments: (folderId: string) =>
    ["folder-documents", folderId] as const,
  search: ["search-data"] as const,
  searchResults: (userId: string, query: string) =>
    ["search-data", userId, query] as const,
  noteConnections: ["note-connections"] as const,
  connections: (noteId: string) => ["note-connections", noteId] as const,
  flashcards: ["flashcards-manage-page"] as const,
  accountSettings: ["account-settings"] as const,
};

export function accountSettingsQuery() {
  return queryOptions({
    queryKey: libraryKeys.accountSettings,
    queryFn: () => fetchAccountSettings(),
    staleTime: 30 * 1000,
  });
}

export function folderOptionsQuery() {
  return queryOptions({
    queryKey: libraryKeys.folderOptions,
    queryFn: () => fetchFolderOptions(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });
}

/** Always refetched: contents may have changed since the dialog last opened. */
export function folderDeletionSummaryQuery(folderId: string) {
  return queryOptions({
    queryKey: libraryKeys.folderDeletionSummary(folderId),
    queryFn: () => fetchFolderDeletionSummary(folderId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function folderDocumentsQuery(folderId: string) {
  return queryOptions({
    queryKey: libraryKeys.folderDocuments(folderId),
    queryFn: () => fetchFolderDocuments(folderId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function noteConnectionsQuery(noteId: string) {
  return queryOptions({
    queryKey: libraryKeys.connections(noteId),
    queryFn: () => fetchNoteConnections(noteId),
    staleTime: 0,
  });
}

export function flashcardsManageQuery(input: FlashcardsManageQueryInput) {
  return queryOptions({
    queryKey: [...libraryKeys.flashcards, input],
    queryFn: () => fetchFlashcardsManagePage(input),
    staleTime: 20 * 1000,
    retry: false,
  });
}
