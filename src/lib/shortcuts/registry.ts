export enum ShortcutCategory {
  Global = "global",
  NotesEditor = "notes_editor",
  Mindmap = "mindmap",
  FlashcardReview = "flashcard_review",
  Reader = "reader",
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
  /**
   * Universal OS-level shortcuts (e.g. plain copy) that every user already
   * knows. Kept in the registry for completeness but hidden from the help
   * dialog so it stays focused on app-specific shortcuts.
   */
  universal?: boolean;
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
  { category: ShortcutCategory.Reader, label: "Library reader" },
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
    id: "global-toggle-sidebar",
    kind: "keys",
    keys: ["cmd+b", "ctrl+b"],
    description: "Toggle sidebar",
    category: ShortcutCategory.Global,
  },
  {
    id: "global-minimize-window",
    kind: "keys",
    keys: ["escape"],
    description: "Minimize the active floating window",
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
  {
    id: "reader-select-tool",
    kind: "keys",
    keys: ["v"],
    description: "Select text tool",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-pan-tool",
    kind: "keys",
    keys: ["h"],
    description: "Hand (pan) tool",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-copy-selection",
    kind: "keys",
    keys: ["cmd+c", "ctrl+c"],
    description: "Copy selected text",
    category: ShortcutCategory.Reader,
    universal: true,
  },
  {
    id: "reader-toggle-sidebar",
    kind: "keys",
    keys: ["cmd+b", "ctrl+b"],
    description: "Toggle sidebar",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-zoom-in",
    kind: "keys",
    keys: ["cmd+=", "ctrl+="],
    description: "Zoom in",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-zoom-out",
    kind: "keys",
    keys: ["cmd+-", "ctrl+-"],
    description: "Zoom out",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-fit-width",
    kind: "keys",
    keys: ["cmd+0", "ctrl+0"],
    description: "Fit width",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-toggle-fullscreen",
    kind: "keys",
    keys: ["f"],
    description: "Toggle fullscreen",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-toggle-spread",
    kind: "keys",
    keys: ["d"],
    description: "Toggle two-page spread",
    category: ShortcutCategory.Reader,
  },
  {
    id: "reader-highlight-tool",
    kind: "keys",
    keys: ["y"],
    description: "Toggle highlight tool",
    category: ShortcutCategory.Reader,
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
  if (pathname.includes("/documents/books/")) {
    active.push(ShortcutCategory.Reader);
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

const hasModifier = (chord: string, modifier: "cmd" | "meta" | "ctrl") =>
  chord.split("+").includes(modifier);

/**
 * A two-chord pair that only differs by Cmd vs Ctrl, e.g.
 * `["cmd+k", "ctrl+k"]`. Such pairs are platform variants of one binding, not
 * genuine alternatives like `["enter", "space"]`.
 */
function isPlatformChordPair(keys: string[]): boolean {
  if (keys.length !== 2) {
    return false;
  }
  const [first, second] = keys;
  const firstMeta = hasModifier(first, "cmd") || hasModifier(first, "meta");
  const secondMeta = hasModifier(second, "cmd") || hasModifier(second, "meta");
  return (
    (firstMeta && hasModifier(second, "ctrl")) ||
    (secondMeta && hasModifier(first, "ctrl"))
  );
}

/**
 * Display strings for a shortcut, collapsing Cmd/Ctrl platform pairs to the
 * single chord that matches the user's OS so the help dialog never shows both.
 * Genuine alternatives (`enter`/`space`) and typed triggers are kept intact.
 *
 * @example
 * resolvePlatformShortcutKeys(searchShortcut, true); // ["⌘ + k"]
 * resolvePlatformShortcutKeys(searchShortcut, false); // ["Ctrl + k"]
 */
export function resolvePlatformShortcutKeys(
  shortcut: Shortcut,
  isMac: boolean,
): string[] {
  if (shortcut.kind === "typed" || !isPlatformChordPair(shortcut.keys)) {
    return displayShortcutKeys(shortcut);
  }
  const chord = shortcut.keys.find((candidate) =>
    isMac
      ? hasModifier(candidate, "cmd") || hasModifier(candidate, "meta")
      : hasModifier(candidate, "ctrl"),
  );
  return formatShortcutKeys(chord ? [chord] : shortcut.keys);
}
