export enum ShortcutCategory {
  Global = "global",
  NotesEditor = "notes_editor",
  Mindmap = "mindmap",
  FlashcardReview = "flashcard_review",
}

/**
 * "keys" entries are key chords formatted per platform (cmd → ⌘);
 * "typed" entries are literal text the user types or a gesture, rendered verbatim.
 */
export type ShortcutKind = "keys" | "typed";

export interface Shortcut {
  id: string;
  kind: ShortcutKind;
  keys: string[];
  description: string;
  category: ShortcutCategory;
}

export interface ShortcutCategorySection {
  category: ShortcutCategory;
  label: string;
}

/** Display order and headings for the shortcuts help dialog. */
export const shortcutCategorySections: ShortcutCategorySection[] = [
  { category: ShortcutCategory.Global, label: "Global" },
  { category: ShortcutCategory.NotesEditor, label: "Notes editor" },
  { category: ShortcutCategory.Mindmap, label: "Mindmap" },
  { category: ShortcutCategory.FlashcardReview, label: "Flashcard review" },
];

export const shortcutRegistry: Shortcut[] = [
  {
    id: "global-search",
    kind: "keys",
    keys: ["cmd+k", "ctrl+k"],
    description: "Search",
    category: ShortcutCategory.Global,
  },
  {
    id: "command-palette",
    kind: "keys",
    keys: ["cmd+p", "ctrl+p"],
    description: "Open command palette",
    category: ShortcutCategory.Global,
  },
  {
    id: "global-shortcuts-help",
    kind: "keys",
    keys: ["?"],
    description: "Show keyboard shortcuts",
    category: ShortcutCategory.Global,
  },
  {
    id: "editor-slash-table",
    kind: "typed",
    keys: ["/table"],
    description: "Insert a table",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-table-next-cell",
    kind: "keys",
    keys: ["tab"],
    description: "Move to the next table cell",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-slash-math",
    kind: "typed",
    keys: ["/math"],
    description: "Insert a block LaTeX equation",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-inline-math",
    kind: "typed",
    keys: ["$...$"],
    description: "Type inline LaTeX math",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-paste-block-math",
    kind: "typed",
    keys: ["$$...$$"],
    description: "Paste block LaTeX math",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-submit",
    kind: "keys",
    keys: ["cmd+enter", "ctrl+enter"],
    description: "Submit the editor form",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-link",
    kind: "keys",
    keys: ["cmd+k", "ctrl+k"],
    description: "Insert or edit a link",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "editor-zen-exit",
    kind: "keys",
    keys: ["escape"],
    description: "Exit zen mode",
    category: ShortcutCategory.NotesEditor,
  },
  {
    id: "mindmap-select-mode",
    kind: "keys",
    keys: ["v"],
    description: "Select mode",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-pan-mode",
    kind: "keys",
    keys: ["h"],
    description: "Pan mode",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-temp-pan",
    kind: "keys",
    keys: ["space"],
    description: "Pan while held",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-delete-selection",
    kind: "keys",
    keys: ["delete", "backspace"],
    description: "Delete selected node and its descendants",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-add-child",
    kind: "keys",
    keys: ["tab"],
    description: "Add child to selected node",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-add-sibling",
    kind: "keys",
    keys: ["shift+enter"],
    description: "Add sibling below selected node",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-copy-node",
    kind: "keys",
    keys: ["cmd+c", "ctrl+c"],
    description: "Copy selected nodes as text",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-undo",
    kind: "keys",
    keys: ["cmd+z", "ctrl+z"],
    description: "Undo",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-redo",
    kind: "keys",
    keys: ["cmd+shift+z", "ctrl+shift+z"],
    description: "Redo",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-edit-label",
    kind: "typed",
    keys: ["Double-click"],
    description: "Edit node or connection label",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "mindmap-zen-exit",
    kind: "keys",
    keys: ["escape"],
    description: "Exit zen mode",
    category: ShortcutCategory.Mindmap,
  },
  {
    id: "flashcard-reveal-grade",
    kind: "keys",
    keys: ["enter", "space"],
    description: "Reveal answer / grade Good after reveal",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-again",
    kind: "keys",
    keys: ["1"],
    description: "Grade: Again",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-hard",
    kind: "keys",
    keys: ["2"],
    description: "Grade: Hard",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-good",
    kind: "keys",
    keys: ["3"],
    description: "Grade: Good",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-grade-easy",
    kind: "keys",
    keys: ["4"],
    description: "Grade: Easy",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-edit",
    kind: "keys",
    keys: ["e"],
    description: "Edit flashcard",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-delete",
    kind: "keys",
    keys: ["d"],
    description: "Delete flashcard",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-reset",
    kind: "keys",
    keys: ["r"],
    description: "Reset review progress",
    category: ShortcutCategory.FlashcardReview,
  },
  {
    id: "flashcard-exit-focus",
    kind: "keys",
    keys: ["escape"],
    description: "Exit focus / exam mode",
    category: ShortcutCategory.FlashcardReview,
  },
];

export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return shortcutRegistry.filter((shortcut) => shortcut.category === category);
}

/**
 * Categories whose shortcuts can fire on the given route, so the help dialog
 * can emphasize what is usable on the current page. Global always applies.
 *
 * @example
 * getActiveShortcutCategories("/flashcards"); // [Global, FlashcardReview]
 */
export function getActiveShortcutCategories(
  pathname: string,
): ShortcutCategory[] {
  const active = [ShortcutCategory.Global];
  if (pathname.includes("/documents/notes/")) {
    active.push(ShortcutCategory.NotesEditor);
  }
  if (pathname.includes("/documents/mindmaps/")) {
    active.push(ShortcutCategory.Mindmap);
  }
  if (pathname.startsWith("/flashcards")) {
    active.push(ShortcutCategory.FlashcardReview);
  }
  return active;
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

const SHORTCUT_KEY_LABELS: Record<string, string> = {
  cmd: "⌘",
  meta: "⌘",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  enter: "Enter",
  space: "Space",
  escape: "Esc",
  tab: "Tab",
  delete: "Del",
  backspace: "Backspace",
};

/**
 * Format a "keys" chord for display: `cmd+shift+z` → `⌘ + Shift + z`.
 *
 * @example
 * formatShortcutKeys(["ctrl+k"]); // ["Ctrl + k"]
 */
export function formatShortcutKeys(keys: string[]): string[] {
  return keys.map((chord) =>
    chord
      .split("+")
      .map((part) => SHORTCUT_KEY_LABELS[part] ?? part)
      .join(" + "),
  );
}

/**
 * Display strings for a shortcut: typed triggers stay verbatim, key chords
 * are platform-formatted.
 *
 * @example
 * displayShortcutKeys(slashTableShortcut); // ["/table"]
 */
export function displayShortcutKeys(shortcut: Shortcut): string[] {
  return shortcut.kind === "typed"
    ? shortcut.keys
    : formatShortcutKeys(shortcut.keys);
}
