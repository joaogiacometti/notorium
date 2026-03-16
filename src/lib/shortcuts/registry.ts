export enum ShortcutCategory {
  Global = "global",
  FlashcardReview = "flashcard_review",
}

export interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: ShortcutCategory;
}

export const shortcutRegistry: Shortcut[] = [
  {
    id: "global-search",
    keys: ["cmd+k", "ctrl+k"],
    description: "global_search.description",
    category: ShortcutCategory.Global,
  },
  {
    id: "flashcard-reveal-grade",
    keys: ["enter"],
    description: "flashcard_review.reveal_grade.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-again",
    keys: ["1"],
    description: "flashcard_review.grade_again.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-hard",
    keys: ["2"],
    description: "flashcard_review.grade_hard.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-good",
    keys: ["3"],
    description: "flashcard_review.grade_good.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-easy",
    keys: ["4"],
    description: "flashcard_review.grade_easy.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-edit",
    keys: ["e"],
    description: "flashcard_review.edit.description",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-delete",
    keys: ["d"],
    description: "flashcard_review.delete.description",
    category: ShortcutCategory.FlashcardReview,
  },
];

export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return shortcutRegistry.filter((shortcut) => shortcut.category === category);
}

export function formatShortcutKeys(keys: string[]): string[] {
  return keys.map((key) => {
    return key
      .replaceAll("cmd", "⌘")
      .replaceAll("ctrl", "Ctrl")
      .replaceAll("alt", "Alt")
      .replaceAll("shift", "Shift")
      .replaceAll("meta", "⌘")
      .replaceAll("+", " + ");
  });
}
