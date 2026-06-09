import { describe, expect, it } from "vitest";
import {
  displayShortcutKeys,
  formatShortcutKeys,
  getActiveShortcutCategories,
  getShortcutsByCategory,
  type Shortcut,
  ShortcutCategory,
  shortcutCategorySections,
  shortcutRegistry,
} from "@/lib/shortcuts/registry";

describe("formatShortcutKeys", () => {
  it("formats modifier chords with platform labels", () => {
    expect(formatShortcutKeys(["cmd+k", "ctrl+k"])).toEqual([
      "⌘ + k",
      "Ctrl + k",
    ]);
  });

  it("maps named keys to readable labels", () => {
    expect(formatShortcutKeys(["space", "escape", "tab"])).toEqual([
      "Space",
      "Esc",
      "Tab",
    ]);
  });

  it("formats multi-modifier chords", () => {
    expect(formatShortcutKeys(["cmd+shift+z"])).toEqual(["⌘ + Shift + z"]);
  });
});

describe("displayShortcutKeys", () => {
  it("returns typed triggers verbatim without chord formatting", () => {
    const typed: Shortcut = {
      id: "test-typed",
      kind: "typed",
      keys: ["/table", "$...$", "$$...$$"],
      description: "test",
      category: ShortcutCategory.NotesEditor,
    };
    expect(displayShortcutKeys(typed)).toEqual(["/table", "$...$", "$$...$$"]);
  });

  it("formats key chords for keys shortcuts", () => {
    const chord: Shortcut = {
      id: "test-keys",
      kind: "keys",
      keys: ["ctrl+enter"],
      description: "test",
      category: ShortcutCategory.NotesEditor,
    };
    expect(displayShortcutKeys(chord)).toEqual(["Ctrl + Enter"]);
  });
});

describe("shortcutRegistry", () => {
  it("has at least one shortcut in every displayed category", () => {
    for (const section of shortcutCategorySections) {
      expect(getShortcutsByCategory(section.category).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("only uses categories that the help dialog displays", () => {
    const displayed = new Set(
      shortcutCategorySections.map((section) => section.category),
    );
    for (const shortcut of shortcutRegistry) {
      expect(displayed.has(shortcut.category)).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = shortcutRegistry.map((shortcut) => shortcut.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getActiveShortcutCategories", () => {
  it("always includes Global", () => {
    expect(getActiveShortcutCategories("/subjects")).toEqual([
      ShortcutCategory.Global,
    ]);
  });

  it("marks the notes editor active on note detail pages", () => {
    expect(
      getActiveShortcutCategories("/subjects/s1/documents/notes/n1"),
    ).toEqual([ShortcutCategory.Global, ShortcutCategory.NotesEditor]);
  });

  it("marks the mindmap active on mindmap detail pages", () => {
    expect(
      getActiveShortcutCategories("/subjects/s1/documents/mindmaps/m1"),
    ).toEqual([ShortcutCategory.Global, ShortcutCategory.Mindmap]);
  });

  it("marks flashcard review active on flashcards routes", () => {
    expect(getActiveShortcutCategories("/flashcards")).toEqual([
      ShortcutCategory.Global,
      ShortcutCategory.FlashcardReview,
    ]);
    expect(getActiveShortcutCategories("/flashcards/abc")).toEqual([
      ShortcutCategory.Global,
      ShortcutCategory.FlashcardReview,
    ]);
  });
});
