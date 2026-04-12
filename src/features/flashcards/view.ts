export const flashcardsViewValues = ["manage", "review", "statistics"] as const;

export type FlashcardsView = (typeof flashcardsViewValues)[number];

export function resolveFlashcardsView(
  view: string | undefined,
): FlashcardsView {
  if (view === "manage" || view === "statistics") {
    return view;
  }

  return "review";
}
