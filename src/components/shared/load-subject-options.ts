import { toast } from "sonner";
import { fetchSubjectOptions } from "@/lib/read-api/subjects";
import type { SubjectOption } from "@/lib/server/api-contracts";

/**
 * Fetch the subject picker options, toasting and resolving `null` on failure
 * so callers keep their current list instead of leaving a rejected promise
 * unhandled.
 *
 * @example
 * const subjects = await loadSubjectOptions();
 * if (subjects) setSubjects(subjects);
 */
export async function loadSubjectOptions(): Promise<SubjectOption[] | null> {
  try {
    return await fetchSubjectOptions();
  } catch {
    toast.error("Could not load subjects.");
    return null;
  }
}
