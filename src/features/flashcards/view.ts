export const flashcardsViewValues = ["manage", "review", "statistics"] as const;

export type FlashcardsView = (typeof flashcardsViewValues)[number];

/**
 * Resolves a raw `view` search param to a valid flashcards view,
 * falling back to "review" for unknown values. The legacy `refine`
 * view was folded into manage, so old `view=refine` links land here.
 *
 * Example: resolveFlashcardsView("refine") // "review"
 */
export function resolveFlashcardsView(
  view: string | undefined,
): FlashcardsView {
  if (view === "manage" || view === "statistics") {
    return view;
  }

  return "review";
}
