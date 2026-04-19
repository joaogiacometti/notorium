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
    description: "Search",
    category: ShortcutCategory.Global,
  },
  {
    id: "flashcard-reveal-grade",
    keys: ["enter"],
    description: "Reveal answer",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-again",
    keys: ["1"],
    description: "Grade: Again",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-hard",
    keys: ["2"],
    description: "Grade: Hard",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-good",
    keys: ["3"],
    description: "Grade: Good",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-easy",
    keys: ["4"],
    description: "Grade: Easy",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-edit",
    keys: ["e"],
    description: "Edit flashcard",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-delete",
    keys: ["d"],
    description: "Delete flashcard",
    category: ShortcutCategory.FlashcardReview,
  },
];

export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return shortcutRegistry.filter((shortcut) => shortcut.category === category);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  let element: Element | null = null;

  if (target instanceof Element) {
    element = target;
  } else if (target instanceof Node) {
    element = target.parentElement;
  }

  if (!element) {
    return false;
  }

  return element.closest("input, textarea, select, [contenteditable]") !== null;
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
