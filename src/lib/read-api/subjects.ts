import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type { SubjectOption } from "@/lib/server/api-contracts";

/**
 * Subjects with full `path` labels, for the flashcard subject pickers.
 *
 * @example
 * const subjects = await fetchSubjectOptions();
 */
export function fetchSubjectOptions(): Promise<SubjectOption[]> {
  return fetchReadApi<SubjectOption[]>("/api/subjects/options");
}
