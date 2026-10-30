import {
  type FlashcardManageFilter,
  flashcardManageFilterSchema,
} from "@/features/flashcards/validation";

export const flashcardsViewValues = ["manage", "review"] as const;

export type FlashcardsView = (typeof flashcardsViewValues)[number];

/**
 * Resolves a raw `view` search param to a valid flashcards view,
 * falling back to "review" for unknown values. Links to the removed
 * `refine` and `statistics` views land here.
 *
 * Example: resolveFlashcardsView("statistics") // "review"
 */
export function resolveFlashcardsView(
  view: string | undefined,
): FlashcardsView {
  if (view === "manage") {
    return "manage";
  }

  return "review";
}

/**
 * Resolves a raw manage `filter` search param, dropping unknown values.
 *
 * Example: resolveFlashcardManageFilter("studyLater") // "studyLater"
 */
export function resolveFlashcardManageFilter(
  filter: string | undefined,
): FlashcardManageFilter | undefined {
  const parsed = flashcardManageFilterSchema.safeParse(filter);
  return parsed.success ? parsed.data : undefined;
}
