export const flashcardsViewValues = ["manage", "review"] as const;

export type FlashcardsView = (typeof flashcardsViewValues)[number];

export function resolveFlashcardsView(
  view: string | undefined,
): FlashcardsView {
  return view === "manage" ? "manage" : "review";
}
