export const flashcardsViewValues = ["manage", "review"] as const;

export type FlashcardsView = (typeof flashcardsViewValues)[number];

/**
 * Resolves a raw `view` search param to a valid flashcards view,
 * falling back to "review" for unknown values. Legacy `refine` links
 * (folded into manage) and the removed `statistics` view both land here.
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
