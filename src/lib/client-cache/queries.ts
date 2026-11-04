import { queryOptions } from "@tanstack/react-query";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import {
  fetchNoteConnections,
  fetchSubjectDocuments,
} from "@/lib/read-api/documents";
import { fetchFlashcardsManagePage } from "@/lib/read-api/flashcards";
import { fetchSubjectOptions } from "@/lib/read-api/subjects";

// The authenticated layout owns a QueryClient per user. Keys describe resources,
// not the component displaying them, so every consumer sees the same updates.
export const libraryKeys = {
  subjects: ["subjects"] as const,
  subjectOptions: ["subjects", "options"] as const,
  documents: ["subject-documents"] as const,
  subjectDocuments: (subjectId: string) =>
    ["subject-documents", subjectId] as const,
  search: ["search-data"] as const,
  searchResults: (userId: string, query: string) =>
    ["search-data", userId, query] as const,
  noteConnections: ["note-connections"] as const,
  connections: (noteId: string) => ["note-connections", noteId] as const,
  flashcards: ["flashcards-manage-page"] as const,
};

export function subjectOptionsQuery() {
  return queryOptions({
    queryKey: libraryKeys.subjectOptions,
    queryFn: () => fetchSubjectOptions(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });
}

export function subjectDocumentsQuery(subjectId: string) {
  return queryOptions({
    queryKey: libraryKeys.subjectDocuments(subjectId),
    queryFn: () => fetchSubjectDocuments(subjectId),
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
