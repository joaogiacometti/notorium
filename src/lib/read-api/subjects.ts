import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type {
  SubjectListItem,
  SubjectOption,
} from "@/lib/server/api-contracts";

/**
 * Subjects with full `path` labels, for the flashcard subject pickers.
 *
 * @example
 * const subjects = await fetchSubjectOptions();
 */
export function fetchSubjectOptions(): Promise<SubjectOption[]> {
  return fetchReadApi<SubjectOption[]>("/api/subjects/options");
}

/**
 * Subject list rows with note counts, for refreshing the subjects table.
 *
 * @example
 * const rows = await fetchSubjectListItems();
 */
export function fetchSubjectListItems(): Promise<SubjectListItem[]> {
  return fetchReadApi<SubjectListItem[]>("/api/subjects");
}
